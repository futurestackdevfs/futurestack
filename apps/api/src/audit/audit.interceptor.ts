import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_KEY, AuditMeta } from './audit.decorator';
import { AuditService } from './audit.service';

/** before/after snapshot a handler may attach to the request for a real diff. */
export interface AuditChanges {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

const SENSITIVE_KEYS = /pass(word)?|token|secret|otp|cvv|card|authorization/i;
const MAX_JSON_CHARS = 8000;

/** Drop secrets, huge blobs and Buffers before persisting a body/response. */
function sanitize(value: unknown, depth = 0): unknown {
  if (value == null || depth > 4) return value ?? null;
  if (Buffer.isBuffer(value)) return `<buffer ${value.length}b>`;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k)) {
        out[k] = '<redacted>';
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) {
    return value.slice(0, 500) + '…';
  }
  return value;
}

/** Only the keys whose value actually changed. */
function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditChanges {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key] ?? null;
      a[key] = after[key] ?? null;
    }
  }
  return { before: b, after: a };
}

function cap(obj: unknown): unknown {
  try {
    const s = JSON.stringify(obj);
    if (s && s.length > MAX_JSON_CHARS) return { truncated: true };
  } catch {
    return { unserializable: true };
  }
  return obj;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<
      Request & { auditChanges?: AuditChanges }
    >();
    const requestBody = req.body ? sanitize(req.body) : undefined;

    return next.handle().pipe(
      tap((response) => {
        // fire-and-forget; AuditService.record never throws
        void this.write(meta, req, requestBody, response);
      }),
    );
  }

  private async write(
    meta: AuditMeta,
    req: Request & { auditChanges?: AuditChanges },
    requestBody: unknown,
    response: unknown,
  ): Promise<void> {
    const user = (req.user ?? {}) as {
      id?: string;
      role?: string;
      email?: string;
      name?: string;
    };

    const idFrom = meta.idFrom ?? 'param';
    let entityId: string | undefined;
    if (idFrom === 'param') {
      const raw = (req.params as Record<string, unknown>)?.[
        meta.idParam ?? 'id'
      ];
      entityId = typeof raw === 'string' ? raw : undefined;
    } else if (idFrom === 'response') {
      const r = response as { id?: string } | undefined;
      entityId = typeof r?.id === 'string' ? r.id : undefined;
    }

    let changes: unknown;
    if (req.auditChanges?.before || req.auditChanges?.after) {
      const c = req.auditChanges;
      changes =
        c.before && c.after
          ? diff(
              c.before as Record<string, unknown>,
              c.after as Record<string, unknown>,
            )
          : { before: c.before ?? null, after: c.after ?? null };
    } else if (meta.action === 'CREATE') {
      changes = { after: sanitize(response) ?? requestBody ?? null };
    } else if (meta.action === 'DELETE') {
      changes = null;
    } else {
      changes = requestBody ? { requested: requestBody } : null;
    }

    const xff = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(xff) ? xff[0] : xff?.split(',')[0]?.trim()) ||
      req.ip ||
      undefined;
    const uaHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader;

    await this.audit.record(
      {
        id: user.id ?? 'unknown',
        role: user.role ?? 'unknown',
        email: user.email ?? null,
        name: user.name ?? null,
        ip,
        userAgent,
      },
      {
        action: meta.action,
        entityType: meta.entity,
        entityId,
        changes: cap(changes) as Record<string, unknown> | undefined,
        meta: meta.meta,
      },
    );
  }
}
