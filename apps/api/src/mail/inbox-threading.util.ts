/** Strips any leading "Re:" / "Fwd:" / "Fw:" so a reply lands in the same thread as the original. */
export function normalizeSubject(subject: string | null | undefined): string {
  return (subject ?? '')
    .replace(/^\s*((re|fwd?)\s*:\s*)+/i, '')
    .trim()
    .toLowerCase();
}

/** `"Asha Rao" <asha@x.com>` style parts from an IMAP/mailparser address → what the UI renders. */
export function toAddress(a: { name?: string | null; address?: string | null } | undefined | null): {
  email: string;
  displayName?: string;
} {
  const email = (a?.address ?? '').trim();
  const name = (a?.name ?? '').trim();
  return name ? { email, displayName: name } : { email };
}
