import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit:meta';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'REFUND'
  | 'DEACTIVATE';

export interface AuditMeta {
  /** Verb recorded on the row. */
  action: AuditAction;
  /** Entity kind, e.g. "Coupon", "Course", "Enrollment". */
  entity: string;
  /**
   * Where the entity id comes from:
   *  - 'param'    → req.params[idParam]  (default, idParam defaults to 'id')
   *  - 'response' → the handler's return value `.id` (use for CREATE)
   *  - 'none'     → no id (bulk / settings singletons)
   */
  idFrom?: 'param' | 'response' | 'none';
  idParam?: string;
  /** Extra static context merged into `meta`. */
  meta?: Record<string, unknown>;
}

/**
 * Marks a controller handler for automatic audit logging by AuditInterceptor.
 * The interceptor records one row AFTER the handler resolves successfully.
 *
 *   @Audit({ action: 'UPDATE', entity: 'Coupon' })
 *   @Patch(':id')
 *   update(...) { ... }
 *
 * For a precise before/after diff, the handler can also set
 * `req.auditChanges = { before, after }` (see AuditChanges) — the interceptor
 * prefers that over the raw request body.
 */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
