"use client";

export type PipelineStatus = "New" | "Interested" | "Converted" | "Dropped";

export interface SalesLead {
  id: string;
  name: string;
  course: string;
  status: PipelineStatus;
  lastContact: string;
  budget: number;
  score: number;
  orderStatus: string;
  batchMode: string | null;
  salespersonId: string | null;
  createdAt: string;
}

export interface LeadOrderBrief {
  id: string;
  totalAmount: number;
  status: string;
  paymentMethod: string | null;
  batchMode: string | null;
  createdAt: string;
  course: string | null;
}

export interface LeadFollowUpRecord {
  id: string;
  action: "scheduled" | "rescheduled" | "completed" | "converted" | "dropped";
  note: string | null;
  scheduledAt: string | null;
  createdAt: string;
}

export interface LeadRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  course: string | null;
  status: PipelineStatus;
  budget: number;
  score: number;
  source: string | null;
  notes: string | null;
  nextFollowUp: string | null;
  lastContact: string | null;
  orderId: string | null;
  studentId: string | null;
  salespersonId: string | null;
  salespersonName: string | null;
  studentName: string | null;
  order: LeadOrderBrief | null;
  createdAt: string;
  updatedAt: string;
  followUps: LeadFollowUpRecord[];
}

export interface SalesStaffMember {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  isActive: boolean;
  leadsCount: number;
  totalValue: number;
  avgValue: number;
}

export interface RevenueSeries {
  labels: string[];
  online: number[];
  offline: number[];
  onlineTotal: number;
  offlineTotal: number;
  combined: number;
  onlineShare: number;
}

export interface SalesDashboard {
  kpi: {
    revenueMtd: number;
    revenueMtdDelta: number;
    pipeline: number;
    pipelineNew: number;
    converted: number;
    convertedWeek: number;
    demosScheduled: number;
    callsMade: number;
    convRate: number;
    convDelta: number;
  };
  revenue: {
    monthly: RevenueSeries;
    yearly: RevenueSeries;
  };
  pipeline: SalesLead[];
  followUps: {
    id: string;
    name: string;
    course: string | null;
    nextFollowUp: string | null;
    salespersonId: string | null;
  }[];
  snapshot: {
    newLeads: number;
    interested: number;
    converted: number;
    dropped: number;
  };
  staff: SalesStaffMember[];
  pipelineCount: number;
  targetPct: number;
}

export interface SalesCourse {
  id: string;
  title: string;
  price: number;
  code: string | null;
  gstPercent: number;
}

export interface SalesStudent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
}

export interface SaleReceipt {
  receiptNo: string;
  studentName?: string;
  studentEmail?: string;
  courseName: string;
  price: number;
  discountPct: number;
  discAmt: number;
  gstPercent: number;
  gstAmount: number;
  finalAmt: number;
  batchMode: "Online" | "Offline";
  paymentMethod: string;
  date: string;
  isNewStudent: boolean;
  generatedPassword: string | null;
}

export interface SaleResult {
  orderId: string;
  status: "processing";
  studentEmail?: string | null;
  studentName?: string | null;
  courseName?: string;
  courseSlug?: string;
  batchMode?: "Online" | "Offline";
  finalAmt?: number;
  leadConverted?: boolean;
  isNewStudent?: boolean;
  createAccount?: boolean;
  tempPassword?: string | null;
  emailSent?: boolean;
}

export interface PendingOrder {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  course: string | null;
  totalAmount: number;
  batchMode: "Online" | "Offline" | null;
  paymentMethod: string | null;
  createdAt: string;
}