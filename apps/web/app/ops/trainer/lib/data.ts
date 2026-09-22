/**
 * Types for the Trainer console.
 */

export interface TrainerBatch {
  id: number;
  code: string;
  course: string;
  schedule: string;
  enrolled: number;
  seats?: number;
  startDate: string;
  progressPct: number;
  currentModule: string;
  nextSession: string;
  status: "Running" | "Upcoming" | "Completed";
  lastUpdated?: string;
}

export interface TrainerSession {
  id: number;
  batchCode: string;
  course: string;
  topic: string;
  date: string;
  time: string;
  link: string;
  materials: { kind: "Slides" | "Notes" | "Project Brief"; name: string }[];
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  attendance?: number;
}

export type StudentFlag = "On Track" | "Falling Behind" | "Ready for Next Module" | "Needs Re-attempt";

export interface TrainerStudent {
  id: number;
  name: string;
  email: string;
  batchCode: string;
  progressPct: number;
  modulesDone: number;
  totalModules: number;
  lastActive: string;
  flag: StudentFlag;
  flaggedToCoordinator: boolean;
  flagReason?: string;
}

export type SubmissionStatus = "New" | "Pending Review" | "Revision Requested" | "Approved";

export interface ProjectSubmission {
  id: number;
  student: string;
  batchCode: string;
  project: string;
  module: string;
  submittedAt: string;
  status: SubmissionStatus;
  feedback: string;
}

export type DoubtStatus = "Open" | "Session Scheduled" | "Resolved";
export type DoubtKind = "Ticket" | "1-on-1 Request" | "Group Session";

export interface DoubtTicket {
  id: number;
  student: string;
  batchCode: string;
  topic: string;
  kind: DoubtKind;
  priority: "High" | "Medium" | "Low";
  raisedAt: string;
  scheduledFor?: string;
  status: DoubtStatus;
}

export type FeedbackKind = "Outdated Material" | "Confusing Topic" | "Content Suggestion";

export interface CurriculumFeedback {
  id: number;
  kind: FeedbackKind;
  course: string;
  module: string;
  note: string;
  raisedAt: string;
  status: "Draft" | "Submitted" | "Acknowledged";
}

export interface RevenueEnrollment {
  id: string;
  student: string;
  batchCode: string;
  course: string;
  courseFee: number;
  paymentMode: "Full" | "EMI" | "Pending";
  paymentMethod: string | null;
  enrolledOn: string;
}

export interface PayoutRecord {
  id: number;
  period: string;
  batchCode: string;
  amount: number;
  status: "Paid" | "Pending";
}

export const INR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Shared with the first-login onboarding wizard and the profile editor. */
export const TRAINER_CAREER_PATHS = [
  "Full Stack Developer", "Frontend Developer", "Backend Developer",
  "Data Scientist", "DevOps Engineer", "AI / ML Engineer",
  "Cybersecurity Specialist", "Mobile Developer", "Cloud Architect",
];
