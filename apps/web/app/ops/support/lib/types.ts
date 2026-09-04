export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketCategory =
  | "PAYMENT"
  | "REFUND"
  | "COURSE_ACCESS"
  | "VIDEO"
  | "CERTIFICATE"
  | "ACCOUNT"
  | "BUG"
  | "LIVE_SESSION"
  | "OTHER";

export interface TicketPerson {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface Ticket {
  id: string;
  number: number;
  ref: string;
  subject: string;
  category: TicketCategory;
  topic: string | null;
  context: Record<string, unknown> | null;
  priority: TicketPriority;
  status: TicketStatus;
  student: TicketPerson;
  assignee: { id: string; name: string } | null;
  lastAgentReply: { by: string; byId: string; at: string } | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface TicketMessage {
  id: string;
  body: string;
  attachmentUrl: string | null;
  isInternalNote: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    isAgent: boolean;
  };
}

export interface TicketThread extends Ticket {
  messages: TicketMessage[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
}

export interface TicketStats {
  OPEN: number;
  PENDING: number;
  RESOLVED: number;
  CLOSED: number;
  TOTAL: number;
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  PAYMENT: "Payments & Billing",
  REFUND: "Refund request",
  COURSE_ACCESS: "Course access",
  VIDEO: "Video problems",
  CERTIFICATE: "Certificates",
  ACCOUNT: "Account & login",
  BUG: "Bug report",
  LIVE_SESSION: "Live class / project",
  OTHER: "Something else",
};

export const STATUS_STYLE: Record<TicketStatus, { color: string; bg: string; label: string }> = {
  OPEN: { color: "var(--blue)", bg: "var(--blue-d)", label: "Open" },
  PENDING: { color: "var(--amber, #b45309)", bg: "var(--amber-d, rgba(180,83,9,.12))", label: "Awaiting student" },
  RESOLVED: { color: "var(--green)", bg: "var(--green-d)", label: "Resolved" },
  CLOSED: { color: "var(--text3)", bg: "var(--panel)", label: "Closed" },
};

export const PRIORITY_STYLE: Record<TicketPriority, { color: string; bg: string }> = {
  LOW: { color: "var(--text3)", bg: "var(--panel)" },
  NORMAL: { color: "var(--blue)", bg: "var(--blue-d)" },
  HIGH: { color: "var(--orange)", bg: "var(--orange-d)" },
  URGENT: { color: "var(--red)", bg: "var(--red-d, rgba(220,38,38,.12))" },
};

/* ── Enrollments / 360° student profile ─────────────────────────── */

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  enrollmentCount: number;
}

export interface ProfileCourse {
  enrollmentId: string;
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  status: string;
  amountPaid: number;
  enrolledAt: string;
  progressPercent: number;
  certificate: { credentialId: string; score: number | null; issuedAt: string } | null;
}

export interface ProfileProject {
  orderItemId: string;
  projectId: string | null;
  name: string;
  image: string | null;
  status: string | null;
  purchasedAt: string;
  progressPercent: number;
}

export interface ProfileRating {
  id: string;
  rating: number;
  comment: string | null;
  on: string;
  createdAt: string;
}

export interface ProfileOrder {
  id: string;
  totalAmount: number;
  currency: string;
  status: string;
  razorpayOrderId: string;
  createdAt: string;
}

export interface ProfileTicket {
  id: string;
  ref: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
}

/* ── Ratings & reviews (per course / per project) ───────────────── */

export type RatingSubjectType = "course" | "project";

export interface RatingSubject {
  id: string;
  type: RatingSubjectType;
  title: string;
  image: string | null;
  rating: number;
  reviewCount: number;
}

export interface RatingReview {
  id: string;
  rating: number;
  comment: string | null;
  student: { id: string; name: string; email: string; avatarUrl: string | null };
  createdAt: string;
}

export interface RatingDetail {
  id: string;
  type: RatingSubjectType;
  title: string;
  image: string | null;
  rating: number;
  reviewCount: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  reviews: RatingReview[];
}

export interface StudentProfile {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    isActive: boolean;
  };
  courses: ProfileCourse[];
  projects: ProfileProject[];
  reviews: ProfileRating[];
  recentOrders: ProfileOrder[];
  tickets: ProfileTicket[];
}

/* ── Payments (read-only) ────────────────────────────────────────── */

export type OrderStatus = "CREATED" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUND_REQUESTED" | "REFUNDED";

export interface PaymentItem {
  id: string;
  title: string;
  type: "course" | "project" | "unknown";
  price: number;
  status: string | null;
}

export interface PaymentRow {
  id: string;
  student: { id: string; name: string; email: string };
  items: PaymentItem[];
  currency: string;
  totalAmount: number;
  status: OrderStatus;
  razorpayOrderId: string;
  paymentMethod: string | null;
  batchMode: string | null;
  createdAt: string;
}

export interface PaymentStats {
  [status: string]: { count: number; total: number };
}

export interface PaymentDetail {
  id: string;
  student: { id: string; name: string; email: string; phone: string | null };
  currency: string;
  gatewayType: string;
  subtotal: number;
  discountAmount: number;
  discountReason: string | null;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  status: OrderStatus;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  paymentMethod: string | null;
  batchMode: string | null;
  billing: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  salesperson: { id: string; name: string } | null;
  items: {
    id: string;
    type: "course" | "project" | "unknown";
    title: string;
    image: string | null;
    price: number;
    currency: string;
    status: string | null;
  }[];
  invoice: { invoiceNumber: string; totalAmount: number; issuedAt: string } | null;
  refunds: {
    id: string;
    amount: number;
    reason: string;
    status: "PENDING" | "PROCESSED" | "REJECTED";
    on: string | null;
    initiatedBy: { id: string; name: string };
    processedAt: string | null;
    createdAt: string;
  }[];
  enrollments: { id: string; courseId: string; status: string; enrolledAt: string }[];
  createdAt: string;
  updatedAt: string;
}

/* ── Raw support-inbox reader (every real email, ticket or not) ─────── */

export interface InboxParticipant {
  email: string;
  displayName?: string;
}

export interface InboxThreadRow {
  id: string;
  subject: string;
  preview: string;
  senders: InboxParticipant[];
  recipients: InboxParticipant[];
  unread: boolean;
  messageCount: number;
  lastMessageId: string;
  updatedAt: string;
  createdAt: string;
}

export interface InboxMessage {
  id: string;
  from: InboxParticipant;
  to: InboxParticipant[];
  cc?: InboxParticipant[];
  subject?: string;
  text: string | null;
  html: string | null;
  attachments: { attachmentId: string; filename: string }[];
  createdAt: string;
}

export interface InboxThreadDetail {
  id: string;
  subject: string;
  messages: InboxMessage[];
}
