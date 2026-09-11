import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditActor {
  id: string;
  role: string;
  email?: string | null;
  name?: string | null;
  /** Public IP the action came from (left-most X-Forwarded-For entry). */
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry {
  action: string;
  entityType?: string;
  entityId?: string;
  /** { before?, after?, requested? } — changed fields only. */
  changes?: Record<string, unknown> | null;
  /** free-form extra context (reason, amount, …) */
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Append-only audit trail. Writes are best-effort: a logging failure must never
 * break the underlying operation, so every failure is swallowed and logged
 * locally instead of thrown. There is deliberately no update / delete method.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(actor: AuditActor, entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          actorEmail: actor.email ?? null,
          actorName: actor.name ?? null,
          action: entry.action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          changes: (entry.changes ?? undefined) as object | undefined,
          meta: (entry.meta ?? undefined) as object | undefined,
          ipAddress: entry.ip ?? actor.ip ?? null,
          userAgent: entry.userAgent ?? actor.userAgent ?? null,
        },
      });
    } catch (e) {
      this.logger.error(
        `Failed to write audit log (${entry.action} ${entry.entityType ?? ''}): ${(e as Error).message}`,
      );
    }
  }

  async list(params: {
    page?: number;
    perPage?: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(100, Math.max(1, params.perPage ?? 50));
    const where: Record<string, unknown> = {};
    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorId) where.actorId = params.actorId;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { rows, total, page, perPage, pageCount: Math.ceil(total / perPage) };
  }
}
