/**
 * Seed data for the Trainer console.
 *
 * Mirrors the admin console pattern: local in-memory data drives the UI until
 * the corresponding backend endpoints exist (batches, sessions, submissions,
 * doubts and payouts are not modeled in the API yet). Each view copies these
 * arrays into React state so edits stay session-local.
 */

export interface TrainerBatch {
  id: number;
  code: string;
  course: string;
  schedule: string;
  enrolled: number;
  startDate: string;
  progressPct: number;
  currentModule: string;
  nextSession: string; // ISO date + label
  status: "Running" | "Upcoming" | "Completed";
}

export interface TrainerSession {
  id: number;
  batchCode: string;
  course: string;
  topic: string;
  date: string; // YYYY-MM-DD
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
  enrolledOn: string;
}

export interface PayoutRecord {
  id: number;
  period: string;
  batchCode: string;
  amount: number;
  status: "Paid" | "Pending";
}

/** Trainer's agreed revenue share of collected batch revenue. */
export const TRAINER_SHARE_PCT = 50;

export const BATCHES: TrainerBatch[] = [
  { id: 1, code: "BAT-MERN-WD-04", course: "MERN Stack Development", schedule: "Weekend · Sat/Sun 10:00–13:00", enrolled: 24, seats: 30, startDate: "2026-05-16", progressPct: 46, currentModule: "M5 · Express.js & REST APIs", nextSession: "2026-07-11 · 10:00", status: "Running" },
  { id: 2, code: "BAT-DS-WK-02", course: "Data Science Foundations", schedule: "Weekend · Sat/Sun 15:00–18:00", enrolled: 18, seats: 25, startDate: "2026-06-06", progressPct: 22, currentModule: "M2 · Pandas & Data Wrangling", nextSession: "2026-07-11 · 15:00", status: "Running" },
  { id: 3, code: "BAT-MERN-WD-05", course: "MERN Stack Development", schedule: "Weekend · Sat/Sun 10:00–13:00", enrolled: 9, seats: 30, startDate: "2026-08-01", progressPct: 0, currentModule: "—", nextSession: "2026-08-01 · 10:00", status: "Upcoming" },
];

export const SESSIONS: TrainerSession[] = [
  { id: 1, batchCode: "BAT-MERN-WD-04", course: "MERN Stack Development", topic: "Express Middleware & Error Handling", date: "2026-07-09", time: "19:00–20:30", link: "https://meet.futurestack.in/mern-wd-04", materials: [{ kind: "Slides", name: "M5-S3-middleware.pdf" }, { kind: "Notes", name: "middleware-cheatsheet.md" }], status: "Scheduled" },
  { id: 2, batchCode: "BAT-DS-WK-02", course: "Data Science Foundations", topic: "GroupBy, Merge & Pivot Tables", date: "2026-07-11", time: "15:00–18:00", link: "https://meet.futurestack.in/ds-wk-02", materials: [{ kind: "Slides", name: "M2-S4-groupby.pdf" }, { kind: "Project Brief", name: "sales-analysis-brief.pdf" }], status: "Scheduled" },
  { id: 3, batchCode: "BAT-MERN-WD-04", course: "MERN Stack Development", topic: "REST API Design & Routing", date: "2026-07-05", time: "10:00–13:00", link: "https://meet.futurestack.in/mern-wd-04", materials: [{ kind: "Slides", name: "M5-S2-rest-design.pdf" }, { kind: "Project Brief", name: "task-api-brief.pdf" }], status: "Completed", attendance: 21 },
  { id: 4, batchCode: "BAT-DS-WK-02", course: "Data Science Foundations", topic: "DataFrames Deep Dive", date: "2026-07-05", time: "15:00–18:00", link: "https://meet.futurestack.in/ds-wk-02", materials: [{ kind: "Slides", name: "M2-S3-dataframes.pdf" }], status: "Completed", attendance: 16 },
];

export const STUDENTS: TrainerStudent[] = [
  { id: 1, name: "Ananya Iyer", email: "ananya.iyer@gmail.com", batchCode: "BAT-MERN-WD-04", progressPct: 62, modulesDone: 5, totalModules: 10, lastActive: "2026-07-08", flag: "Ready for Next Module", flaggedToCoordinator: false },
  { id: 2, name: "Rohan Kulkarni", email: "rohan.k@gmail.com", batchCode: "BAT-MERN-WD-04", progressPct: 48, modulesDone: 4, totalModules: 10, lastActive: "2026-07-09", flag: "On Track", flaggedToCoordinator: false },
  { id: 3, name: "Priya Sharma", email: "priya.sh@gmail.com", batchCode: "BAT-MERN-WD-04", progressPct: 21, modulesDone: 2, totalModules: 10, lastActive: "2026-06-28", flag: "Falling Behind", flaggedToCoordinator: false },
  { id: 4, name: "Aditya Menon", email: "aditya.m@gmail.com", batchCode: "BAT-MERN-WD-04", progressPct: 35, modulesDone: 3, totalModules: 10, lastActive: "2026-07-07", flag: "Needs Re-attempt", flaggedToCoordinator: false },
  { id: 5, name: "Sneha Patil", email: "sneha.p@gmail.com", batchCode: "BAT-DS-WK-02", progressPct: 30, modulesDone: 2, totalModules: 8, lastActive: "2026-07-09", flag: "On Track", flaggedToCoordinator: false },
  { id: 6, name: "Vikram Rao", email: "vikram.r@gmail.com", batchCode: "BAT-DS-WK-02", progressPct: 12, modulesDone: 1, totalModules: 8, lastActive: "2026-06-30", flag: "Falling Behind", flaggedToCoordinator: true },
  { id: 7, name: "Kavya Nair", email: "kavya.n@gmail.com", batchCode: "BAT-DS-WK-02", progressPct: 38, modulesDone: 3, totalModules: 8, lastActive: "2026-07-08", flag: "Ready for Next Module", flaggedToCoordinator: false },
  { id: 8, name: "Arjun Deshpande", email: "arjun.d@gmail.com", batchCode: "BAT-MERN-WD-04", progressPct: 55, modulesDone: 5, totalModules: 10, lastActive: "2026-07-09", flag: "On Track", flaggedToCoordinator: false },
];

export const SUBMISSIONS: ProjectSubmission[] = [
  { id: 1, student: "Ananya Iyer", batchCode: "BAT-MERN-WD-04", project: "Task Manager REST API", module: "M5", submittedAt: "2026-07-08", status: "New", feedback: "" },
  { id: 2, student: "Rohan Kulkarni", batchCode: "BAT-MERN-WD-04", project: "Task Manager REST API", module: "M5", submittedAt: "2026-07-07", status: "Pending Review", feedback: "" },
  { id: 3, student: "Priya Sharma", batchCode: "BAT-MERN-WD-04", project: "Portfolio Site (React)", module: "M4", submittedAt: "2026-07-02", status: "Revision Requested", feedback: "Components are duplicated — extract a shared Card component and use props. Also fix the broken mobile nav." },
  { id: 4, student: "Sneha Patil", batchCode: "BAT-DS-WK-02", project: "Sales Data Analysis", module: "M2", submittedAt: "2026-07-06", status: "New", feedback: "" },
  { id: 5, student: "Arjun Deshpande", batchCode: "BAT-MERN-WD-04", project: "Portfolio Site (React)", module: "M4", submittedAt: "2026-06-29", status: "Approved", feedback: "Clean component structure, good use of hooks. Approved." },
];

export const DOUBTS: DoubtTicket[] = [
  { id: 1, student: "Priya Sharma", batchCode: "BAT-MERN-WD-04", topic: "Confused between middleware next() and route handlers", kind: "Ticket", priority: "High", raisedAt: "2026-07-08", status: "Open" },
  { id: 2, student: "Vikram Rao", batchCode: "BAT-DS-WK-02", topic: "Pandas merge vs join — when to use which?", kind: "Ticket", priority: "Medium", raisedAt: "2026-07-07", status: "Open" },
  { id: 3, student: "Aditya Menon", batchCode: "BAT-MERN-WD-04", topic: "1-on-1 help before module re-attempt", kind: "1-on-1 Request", priority: "High", raisedAt: "2026-07-06", status: "Session Scheduled", scheduledFor: "2026-07-10 · 18:00" },
  { id: 4, student: "Batch-wide", batchCode: "BAT-DS-WK-02", topic: "Doubt-clearing session: Data wrangling recap", kind: "Group Session", priority: "Medium", raisedAt: "2026-07-05", status: "Session Scheduled", scheduledFor: "2026-07-12 · 18:00" },
  { id: 5, student: "Kavya Nair", batchCode: "BAT-DS-WK-02", topic: "Environment setup issue with Jupyter", kind: "Ticket", priority: "Low", raisedAt: "2026-07-03", status: "Resolved" },
];

export const FEEDBACK: CurriculumFeedback[] = [
  { id: 1, kind: "Outdated Material", course: "MERN Stack Development", module: "M3 · React Basics", note: "Slides still show class components — should be rewritten around hooks and function components.", raisedAt: "2026-07-01", status: "Submitted" },
  { id: 2, kind: "Confusing Topic", course: "MERN Stack Development", module: "M5 · Express.js", note: "Students consistently struggle with async error handling in Express. Needs a dedicated worked example.", raisedAt: "2026-07-06", status: "Draft" },
  { id: 3, kind: "Content Suggestion", course: "Data Science Foundations", module: "M2 · Pandas", note: "Add a lesson on reading data from APIs/JSON — most real datasets students meet are not CSVs.", raisedAt: "2026-06-25", status: "Acknowledged" },
];

export const INR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
