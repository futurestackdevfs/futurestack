export type EscType =
  | "TRAINER_FLAG"
  | "SUPPORT_TICKET"
  | "REFUND"
  | "PAYMENT"
  | "CONTENT"
  | "COMPLAINT"
  | "COORDINATOR"
  | "MANUAL";
export type EscSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EscStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

export interface EscalationRow {
  id: string;
  ref: string;
  number: number;
  type: EscType;
  severity: EscSeverity;
  status: EscStatus;
  title: string;
  reason: string;
  autoRaised: boolean;
  student: { id: string; name: string; email: string } | null;
  assignee: { id: string; name: string; role: string } | null;
  createdBy: { id: string; name: string } | null;
  orderId: string | null;
  ticketId: string | null;
  refundId: string | null;
  courseId: string | null;
  videoId: string | null;
  dueAt: string | null;
  slaBreached: boolean;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ageHours: number;
}

export interface EscalationEventRow {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

export interface EscalationDetailData extends EscalationRow {
  events: EscalationEventRow[];
  context: {
    ticket: { ref: string; subject: string; status: string } | null;
    course: { title: string } | null;
    order: { total: number; currency: string; status: string } | null;
  };
}

export interface EscSummary {
  active: number;
  critical: number;
  breached: number;
  resolvedToday: number;
  avgResolveHours: number | null;
  byType: Partial<Record<EscType, number>>;
}

export interface EscSettings {
  ticketSlaHours: number;
  refundPendingHours: number;
  paidGraceMinutes: number;
  complaintMinCount: number;
  complaintWindowDays: number;
  coordinatorSlaDays: number;
  ticketAutoCloseDays: number;
  resolveSlaHours: number;
  alertsEnabled: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export const TYPE_META: Record<EscType, { label: string; icon: string; hint: string }> = {
  TRAINER_FLAG: { label: "Trainer flag", icon: "🚩", hint: "A trainer flagged a student" },
  SUPPORT_TICKET: { label: "Support ticket", icon: "🎧", hint: "Ticket waiting on an agent past its SLA" },
  REFUND: { label: "Refund", icon: "💸", hint: "Refund waiting for approval" },
  PAYMENT: { label: "Payment", icon: "💵", hint: "Paid order missing an enrollment or invoice" },
  CONTENT: { label: "Content", icon: "🎬", hint: "Video failed processing" },
  COMPLAINT: { label: "Complaint", icon: "⭐", hint: "Course collecting low ratings" },
  COORDINATOR: { label: "Coordinator SLA", icon: "⏱", hint: "Trainer flag the coordinator left unresolved" },
  MANUAL: { label: "Manual", icon: "✍", hint: "Raised by an admin" },
};

export const SEVERITY_META: Record<EscSeverity, { label: string; color: string; bg: string }> = {
  LOW: { label: "Low", color: "var(--text2)", bg: "var(--bg2)" },
  MEDIUM: { label: "Medium", color: "#d97706", bg: "rgba(217,119,6,.12)" },
  HIGH: { label: "High", color: "var(--red)", bg: "var(--red-d)" },
  CRITICAL: { label: "Critical", color: "#fff", bg: "var(--red)" },
};

export const STATUS_META: Record<EscStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Open", color: "var(--red)", bg: "var(--red-d)" },
  ASSIGNED: { label: "Assigned", color: "var(--blue)", bg: "var(--blue-d)" },
  IN_PROGRESS: { label: "In progress", color: "#d97706", bg: "rgba(217,119,6,.12)" },
  RESOLVED: { label: "Resolved", color: "var(--green)", bg: "var(--green-d)" },
  DISMISSED: { label: "Dismissed", color: "var(--text3)", bg: "var(--bg2)" },
};

export const ACTIVE: EscStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS"];

export function isActive(s: EscStatus) {
  return ACTIVE.includes(s);
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** "5h", "2d 3h" — how long something has been open. */
export function fmtAge(hours: number) {
  if (hours < 1) return "<1h";
  if (hours < 48) return `${hours}h`;
  const d = Math.floor(hours / 24);
  return `${d}d ${hours % 24}h`;
}

/** Time left / overdue against the resolve-by time. */
export function fmtDue(dueAt: string | null, breached: boolean) {
  if (!dueAt) return "—";
  const diffH = Math.round((new Date(dueAt).getTime() - Date.now()) / 3_600_000);
  if (breached || diffH < 0) return `${fmtAge(Math.abs(diffH))} overdue`;
  return `due in ${fmtAge(Math.max(diffH, 0))}`;
}

/** Where to look at the thing an escalation is about. */
export function sourceLinks(e: EscalationRow): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (e.ticketId) links.push({ label: "Open ticket", href: `/ops/support?ticket=${e.ticketId}` });
  if (e.refundId) links.push({ label: "Refunds", href: "/ops/admin?view=refunds" });
  if (e.orderId) links.push({ label: "Payments", href: "/ops/admin?view=payments" });
  if (e.student) links.push({ label: "User accounts", href: "/ops/admin?view=users" });
  return links;
}
