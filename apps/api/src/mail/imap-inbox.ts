import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeSubject, toAddress } from './inbox-threading.util';

/** The slice of an imapflow client we use - kept loose so this file doesn't depend on its typings. */
interface ImapClient {
  connect(): Promise<void>;
  logout(): Promise<void>;
  list(): Promise<{ path: string; specialUse?: string; flags?: Set<string> }[]>;
  status(path: string, q: Record<string, boolean>): Promise<{ messages?: number; unseen?: number }>;
  getMailboxLock(path: string): Promise<{ release(): void }>;
  search(query: Record<string, unknown>, opts?: { uid?: boolean }): Promise<number[] | false>;
  fetch(range: number[] | string, query: Record<string, unknown>, opts?: { uid?: boolean }): AsyncIterable<any>;
  fetchOne(seq: string, query: Record<string, unknown>, opts?: { uid?: boolean }): Promise<any>;
  messageFlagsAdd(range: number[] | string, flags: string[], opts?: { uid?: boolean }): Promise<boolean>;
  append(path: string, content: Buffer, flags?: string[]): Promise<unknown>;
  usable?: boolean;
  on(event: 'error' | 'close', cb: (e: Error) => void): void;
}

export type FolderKey = 'inbox' | 'sent' | 'junk' | 'trash';

const FOLDERS: { key: FolderKey; label: string; special: string; fallback: string }[] = [
  { key: 'inbox', label: 'Inbox', special: '\\Inbox', fallback: 'INBOX' },
  { key: 'sent', label: 'Sent', special: '\\Sent', fallback: 'INBOX.Sent' },
  { key: 'junk', label: 'Spam', special: '\\Junk', fallback: 'INBOX.Junk' },
  { key: 'trash', label: 'Trash', special: '\\Trash', fallback: 'INBOX.Trash' },
];

const PAGE = 10;

/** Which part of the site a mail came from, for the chip in the list. */
export function siteSourceOf(subject: string | undefined, inReplyTo: string | undefined): string {
  const s = subject ?? '';
  if (/^\[Support\]/i.test(s)) return 'Support ticket';
  if (/^\[Escalations\]/i.test(s)) return 'Escalation';
  if (/^\[R&D Inquiry\]/i.test(s)) return 'R&D inquiry';
  if (/^\[Contact\b/i.test(s)) return 'Contact form';
  if (/\[Careers\]|FutureStack Careers|^(re:\s*)*Application:/i.test(s)) return 'Careers';
  if (inReplyTo && inReplyTo.includes('<fs-')) return 'Customer reply';
  return '';
}

/** Message ids look like `inbox-1234` so a uid is never confused across folders. */
export function parseMessageId(id: string): { folder: FolderKey; uid: number } {
  const m = /^(inbox|sent|junk|trash)-(\d+)$/.exec(id ?? '');
  if (!m) throw new BadRequestException('Invalid message id');
  return { folder: m[1] as FolderKey, uid: Number(m[2]) };
}

const snippet = (text: string | undefined | null) =>
  (text ?? '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);

const stripHtml = (html: string) =>
  html
    .replace(/<(style|script|head)[\s\S]*?<\/>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&');

/** A reply (Re: / Fwd: subject or an In-Reply-To header) - only those are pulled into a conversation. */
const isReply = (env: { subject?: string; inReplyTo?: string } | undefined | null) =>
  /^\s*(re|fwd?)\s*:/i.test(env?.subject ?? '') || !!env?.inReplyTo;

/**
 * Reads the support mailbox (Hostinger) over IMAP: every folder, every message,
 * with the conversation view merging what the customer sent and what we replied.
 * A fresh connection per call keeps it simple; the inbox is a low-traffic screen.
 */
export class ImapInbox {
  /** Tab counts barely change second to second; counting them is the slow part of opening the Inbox. */
  private countsCache: { at: number; value: { key: FolderKey; label: string; total: number; unread: number }[] } | null = null;

  constructor(private readonly config: ConfigService) {}

  private get settings() {
    const user = this.config.get<string>('IMAP_USER') ?? this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('IMAP_PASS') ?? this.config.get<string>('SMTP_PASS');
    if (!user || !pass) {
      throw new ServiceUnavailableException(
        'The inbox is not configured. Set SMTP_USER / SMTP_PASS (or IMAP_USER / IMAP_PASS) in the server .env.',
      );
    }
    return {
      host: this.config.get<string>('IMAP_HOST') ?? 'imap.hostinger.com',
      port: Number(this.config.get<string>('IMAP_PORT') ?? 993),
      user,
      pass,
    };
  }

  /** One long-lived connection, reused by every call - a fresh TLS + login each time cost seconds. */
  private shared: ImapClient | null = null;
  private folderPaths: Record<FolderKey, string> | null = null;
  /** IMAP commands on one connection run one at a time. */
  private queue: Promise<unknown> = Promise.resolve();

  private async connect(): Promise<ImapClient> {
    const s = this.settings;
    const { ImapFlow } = await import('imapflow');
    const client = new ImapFlow({
      host: s.host,
      port: s.port,
      secure: s.port === 993,
      auth: { user: s.user, pass: s.pass },
      logger: false,
    }) as unknown as ImapClient;
    // An unhandled 'error' event would crash the process; the failing call rejects instead.
    client.on('error', () => undefined);
    client.on('close', () => {
      if (this.shared === client) this.shared = null; // the server dropped us - reconnect on next use
    });
    try {
      await client.connect();
    } catch {
      throw new ServiceUnavailableException('Could not connect to the mailbox. Check IMAP_HOST / credentials.');
    }
    return client;
  }

  private async withClient<T>(fn: (client: ImapClient, paths: Record<FolderKey, string>) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      if (!this.shared || this.shared.usable === false) {
        this.shared = await this.connect();
        this.folderPaths = null;
      }
      const client = this.shared;
      if (!this.folderPaths) {
        // Folder names differ per provider (Hostinger: INBOX.Sent) - find them by their role.
        const boxes = await client.list();
        const paths = {} as Record<FolderKey, string>;
        for (const f of FOLDERS) {
          paths[f.key] = boxes.find((b) => b.specialUse === f.special)?.path ?? f.fallback;
        }
        this.folderPaths = paths;
      }
      return fn(client, this.folderPaths);
    };
    const next = this.queue.then(async () => {
      try {
        return await run();
      } catch (e) {
        // A stale connection fails mid-call: drop it and try once more on a fresh one.
        if (e instanceof ServiceUnavailableException || e instanceof BadRequestException) throw e;
        const stale = this.shared;
        this.shared = null;
        stale?.logout().catch(() => undefined);
        return run();
      }
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Open the connection and count the folders in the background, so the first click on Inbox is already fast. */
  warmUp() {
    try {
      void this.listMessages({ limit: 10 }).catch(() => undefined);
    } catch {
      /* not configured - nothing to warm */
    }
  }

  /** Close the shared connection (app shutdown). */
  async close() {
    const c = this.shared;
    this.shared = null;
    await c?.logout().catch(() => undefined);
  }

  /** Newest-first page of one folder; `pageToken` is the lowest uid already shown. */
  async listMessages(opts: { q?: string; limit?: number; pageToken?: string; folder?: string; refresh?: boolean }) {
    const folder = (FOLDERS.find((f) => f.key === opts.folder)?.key ?? 'inbox') as FolderKey;
    const limit = Math.min(Math.max(opts.limit ?? PAGE, 10), 100);
    const { simpleParser } = await import('mailparser');

    return this.withClient(async (client, paths) => {
      // Tab counts for every folder (cheap STATUS command; cached for a few minutes).
      let folders: { key: FolderKey; label: string; total: number; unread: number }[] = [];
      // "Show more" pages never recount the folders - that only slows the click down.
      const fresh = this.countsCache && Date.now() - this.countsCache.at < 180_000 && !opts.refresh;
      const cached = this.countsCache && (opts.pageToken || fresh) ? this.countsCache.value : null;
      if (cached) folders = cached;
      else if (!opts.pageToken) {
        for (const f of FOLDERS) {
          try {
            const st = await client.status(paths[f.key], { messages: true, unseen: true });
            folders.push({ key: f.key, label: f.label, total: st.messages ?? 0, unread: st.unseen ?? 0 });
          } catch {
            folders.push({ key: f.key, label: f.label, total: 0, unread: 0 });
          }
        }
        this.countsCache = { at: Date.now(), value: folders };
      }

      const lock = await client.getMailboxLock(paths[folder]);
      try {
        const q = opts.q?.trim();
        // Every mail in the folder. Mails that came from the website are labelled in the list (siteSourceOf).
        let found = (await client.search({ all: true }, { uid: true })) || [];
        if (q) {
          const hit = new Set((await client.search({ or: [{ subject: q }, { from: q }, { to: q }, { body: q }] }, { uid: true })) || []);
          found = found.filter((u) => hit.has(u));
        }
        let uids = found.sort((a, b) => b - a);
        const matched = uids.length;
        if (opts.pageToken) uids = uids.filter((u) => u < Number(opts.pageToken));
        const page = uids.slice(0, limit);
        if (page.length === 0) return { folder, folders, total: matched, threads: [], nextPageToken: undefined };

        const rows: Record<string, unknown>[] = [];
        // A few KB of each message is enough for the one-line preview.
        for await (const m of client.fetch(
          page,
          { uid: true, envelope: true, flags: true, internalDate: true, source: { start: 0, maxLength: 24000 } },
          { uid: true },
        )) {
          const env = m.envelope ?? {};
          let preview = '';
          try {
            const p = await simpleParser(m.source);
            preview = snippet(p.text) || snippet(typeof p.html === 'string' ? stripHtml(p.html) : '');
          } catch {
            /* a truncated MIME body can fail to parse - the row just has no preview */
          }
          const date = new Date(env.date ?? m.internalDate ?? Date.now());
          rows.push({
            id: `${folder}-${m.uid}`,
            subject: env.subject || '(no subject)',
            preview,
            senders: [toAddress(env.from?.[0])],
            recipients: (env.to ?? []).map(toAddress),
            unread: !m.flags?.has('\\Seen'),
            source: siteSourceOf(env.subject, env.inReplyTo),
            messageCount: 1,
            lastMessageId: `${folder}-${m.uid}`,
            updatedAt: date.toISOString(),
            createdAt: date.toISOString(),
          });
        }
        rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

        const more = uids.length > page.length;
        return { folder, folders, total: matched, threads: rows, nextPageToken: more ? String(page[page.length - 1]) : undefined };
      } finally {
        lock.release();
      }
    });
  }

  /** The conversation this message belongs to: what the customer sent plus our replies, oldest first. */
  async getThread(id: string) {
    const { folder, uid } = parseMessageId(id);
    const { simpleParser } = await import('mailparser');

    return this.withClient(async (client, paths) => {
      const toMsg = async (f: FolderKey, m: any, mine: boolean) => {
        const p = await simpleParser(m.source);
        return {
          id: `${f}-${m.uid}`,
          fromMe: mine,
          from: toAddress(p.from?.value?.[0]),
          to: (p.to ? [p.to].flat() : []).flatMap((a) => a.value).map(toAddress),
          cc: (p.cc ? [p.cc].flat() : []).flatMap((a) => a.value).map(toAddress),
          subject: p.subject ?? '(no subject)',
          text: p.text ?? null,
          html: typeof p.html === 'string' ? p.html : null,
          attachments: (p.attachments ?? []).map((a, i) => ({
            index: i,
            filename: a.filename ?? 'attachment',
            contentType: a.contentType,
            size: a.size,
          })),
          createdAt: (p.date ?? new Date()).toISOString(),
        };
      };

      // 1) the message that was opened + its siblings in the same folder
      let subject = '(no subject)';
      let counterparty = '';
      const out: Awaited<ReturnType<typeof toMsg>>[] = [];
      const lock = await client.getMailboxLock(paths[folder]);
      try {
        const head = await client.fetchOne(String(uid), { uid: true, envelope: true }, { uid: true });
        if (!head) throw new BadRequestException('Message not found');
        subject = head.envelope?.subject || '(no subject)';
        const env = head.envelope ?? {};
        counterparty = folder === 'sent' ? toAddress(env.to?.[0]).email : toAddress(env.from?.[0]).email;
        const base = normalizeSubject(subject);
        const openedIsReply = isReply(env);

        // IMAP SUBJECT is a substring match - narrow it to the exact conversation afterwards.
        const query: Record<string, unknown> = { subject: base };
        if (counterparty) query[folder === 'sent' ? 'to' : 'from'] = counterparty;
        const candidates = (await client.search(query, { uid: true })) || [];
        const uids = [...new Set([...candidates, uid])].sort((a, b) => a - b).slice(-20);
        for await (const m of client.fetch(uids, { uid: true, envelope: true, source: true }, { uid: true })) {
          if (normalizeSubject(m.envelope?.subject) !== base) continue;
          // Repeated notification emails share a subject but are not a conversation.
          if (m.uid !== uid && !openedIsReply && !isReply(m.envelope)) continue;
          out.push(await toMsg(folder, m, folder === 'sent'));
        }
        // Opening a message marks it read, like any mail client.
        await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true }).catch(() => undefined);
        this.countsCache = null;
      } finally {
        lock.release();
      }

      // 2) the other side of the conversation (our replies live in Sent, the customer's mail in Inbox)
      const other: FolderKey = folder === 'sent' ? 'inbox' : 'sent';
      if (counterparty) {
        const lock2 = await client.getMailboxLock(paths[other]);
        try {
          const base = normalizeSubject(subject);
          const q2: Record<string, unknown> = { subject: base };
          q2[other === 'sent' ? 'to' : 'from'] = counterparty;
          const found = ((await client.search(q2, { uid: true })) || []).sort((a, b) => a - b).slice(-20);
          if (found.length) {
            for await (const m of client.fetch(found, { uid: true, envelope: true, source: true }, { uid: true })) {
              if (normalizeSubject(m.envelope?.subject) !== base) continue;
              if (!isReply(m.envelope)) continue;
              out.push(await toMsg(other, m, other === 'sent'));
            }
          }
        } catch {
          /* the other folder is a bonus - never fail the whole conversation over it */
        } finally {
          lock2.release();
        }
      }

      out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { id, subject, messages: out };
    });
  }

  /** Who to answer and the headers that keep our reply inside the customer's thread. */
  async replyContext(id: string) {
    const { folder, uid } = parseMessageId(id);
    const { simpleParser } = await import('mailparser');

    return this.withClient(async (client, paths) => {
      const lock = await client.getMailboxLock(paths[folder]);
      try {
        const m = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
        if (!m) throw new BadRequestException('Message not found');
        const p = await simpleParser(m.source);
        // Replying to something we sent means writing to its recipient again.
        const to =
          folder === 'sent'
            ? p.to
              ? [p.to].flat()[0]?.value?.[0]?.address
              : undefined
            : p.replyTo?.value?.[0]?.address ?? p.from?.value?.[0]?.address;
        if (!to) throw new BadRequestException('This message has no address to reply to');
        const refs = p.references ? [p.references].flat() : [];
        const subject = p.subject ?? '';
        return {
          to,
          subject: /^\s*re\s*:/i.test(subject) ? subject : `Re: ${subject}`,
          inReplyTo: p.messageId,
          references: p.messageId ? [...refs, p.messageId] : refs,
          sentPath: paths.sent,
          // for the "include original message" quote under the reply
          quoted: {
            from: toAddress(p.from?.value?.[0]),
            date: p.date ?? null,
            text: (p.text ?? '').slice(0, 4000),
          },
        };
      } finally {
        lock.release();
      }
    });
  }

  /** One attachment of one message, for the download button. */
  async getAttachment(id: string, index: number) {
    const { folder, uid } = parseMessageId(id);
    if (!Number.isInteger(index) || index < 0) throw new BadRequestException('Invalid attachment');
    const { simpleParser } = await import('mailparser');

    return this.withClient(async (client, paths) => {
      const lock = await client.getMailboxLock(paths[folder]);
      try {
        const m = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
        if (!m) throw new BadRequestException('Message not found');
        const a = (await simpleParser(m.source)).attachments?.[index];
        if (!a) throw new BadRequestException('Attachment not found');
        return { filename: a.filename ?? 'attachment', content: a.content as Buffer };
      } finally {
        lock.release();
      }
    });
  }

  /** Best effort: keep a copy of an outgoing reply in the Sent folder so it shows up in the conversation. */
  async saveToSent(raw: Buffer, sentPath: string) {
    try {
      await this.withClient(async (client) => {
        await client.append(sentPath, raw, ['\\Seen']);
      });
    } catch {
      /* the reply was already sent; a missing Sent copy must not turn that into an error */
    }
  }
}
