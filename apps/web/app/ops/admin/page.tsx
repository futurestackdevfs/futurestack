"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { loadStaffToken, clearStaffToken } from "@/app/auth/lib/token-store";
import { AdminTopbar } from "./sections/AdminTopbar";
import { AdminSidebar } from "./sections/AdminSidebar";
import { Statusbar } from "./sections/Statusbar";
import { KpiStrip } from "./sections/KpiStrip";
import { EntityTabs, type EntityTab } from "./sections/EntityTabs";
import { EntityTable, StatusBadge, YesNoBadge, type ColumnDef } from "./sections/EntityTable";
import { MasterDataModal, type FieldDef } from "./sections/MasterDataModal";
import { ConfirmDialog, type ConfirmOptions } from "./sections/ConfirmDialog";
import { CurriculumBuilder } from "./sections/CurriculumBuilder";
import { ResourceManagerModal } from "./sections/ResourceManagerModal";
import { ProfileModal } from "./sections/ProfileModal";
import FeaturedManager from "./sections/FeaturedManager";
import PaymentSettingsManager from "./sections/PaymentSettingsManager";
import PaymentsManager from "./sections/PaymentsManager";
import AdminDashboardContent from "./console/AdminDashboardContent";
import SalesDashboardContent from "./console/SalesDashboardContent";
import TrainerDashboardContent from "./console/TrainerDashboardContent";
import CoordinatorDashboardContent from "./console/CoordinatorDashboardContent";
import SupportDashboardContent from "./console/SupportDashboardContent";
import ContentMgrDashboardContent from "./console/ContentMgrDashboardContent";
import UsersDashboardContent from "./console/UsersDashboardContent";

/* ───────────────────────────────────────────────
   TYPES
─────────────────────────────────────────────── */
interface Course {
  id: number; code: string; name: string; category: string; level: string;
  duration: number; modules: number; totalLessons: number; totalHours: number;
  description: string; learnOutcomes: string; technologies: string;
  careerTitle: string; careerBody: string; instructor: string; thumbnailLabel: string; status: string;
}
interface Batch {
  id: number; code: string; course: string; instructor: string;
  schedule: string; seats: number; enrolled: number; startDate: string; status: string;
}
interface Instructor {
  id: number; instId: string; name: string; specialization: string;
  email: string; phone: string; activeBatches: number; rating: number; status: string;
}
interface FeePlan {
  id: number; code: string; name: string; course: string; baseFee: number;
  discountPct: number; emiAvailable: string; emiMonths: number | null; status: string;
}
interface Cert {
  id: number; code: string; name: string; course: string; passingPct: number;
  validityYears: number | null; issuedCount: number; status: string;
}
interface Department {
  id: number; code: string; name: string; head: string; roles: string; headcount: number; status: string;
}

interface CourseStats {
  totalCourses: number; activeCourses: number; draftCourses: number;
  totalTracks: number; totalTrainers: number; pendingTrainers: number;
  totalStudents: number; totalEnrollments: number; activeEnrollments: number;
}

interface CurriculumEntry {
  nextSectionId: number;
  sections: { id: number; num: string; title: string; lessons: { id: number; name: string; type: string; duration: string }[] }[];
}

let DB: { [key: string]: any[] } = {
  courses: [], batches: [], instructors: [], feeplans: [], certs: [], departments: [], admins: [],
};

let nextId: { [key: string]: number } = {
  courses: 1, batches: 1, instructors: 1, feeplans: 1, certs: 1, departments: 1,
};

/* ───────────────────────────────────────────────
   SCHEMAS
─────────────────────────────────────────────── */
const ENTITY_ICONS: Record<string, string> = {
  courses: "📚", batches: "📅", instructors: "🎓", feeplans: "💳", certs: "🏅", departments: "🏢",
};

// Course.skillLevel enum (BEGINNER/…) ↔ display label
const SKILL_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};
const SKILL_LEVEL_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(SKILL_LEVEL_LABELS).map(([k, v]) => [v, k]),
);

// Same curated career paths as the student profile — shown in the course form's
// Career Path dropdown (with an "Others…" option for brand-new domains). The
// picked value is saved into the Track table (find-or-create + link).
const CAREER_PATHS = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "DevOps Engineer",
  "AI / ML Engineer",
  "Cybersecurity Specialist",
  "Mobile Developer",
  "Cloud Architect",
];

const ENTITY_NAMES: Record<string, string> = {
  courses: "Course", batches: "Batch", instructors: "Instructor", feeplans: "Fee Plan", certs: "Certification Template", departments: "Department",
};

const SCHEMAS: Record<string, FieldDef[]> = {
  courses: [
    // NOTE: category & level persist to the backend (Course.category /
    // Course.skillLevel). duration, modules, totalLessons, totalHours are
    // computed server-side from the curriculum (sections/videos/quizzes) and
    // are read-only here — editing them in the form has no effect.
    { key: "title", label: "Course Name", type: "text", required: true, placeholder: "e.g. MERN Stack Development", full: true },
    { key: "category", label: "Category", type: "select", required: true, options: ["Full Stack", "Data Science", "AI / ML", "DevOps", "Cybersecurity", "Programming", "Cloud"], allowCustom: true, full: true },
    { key: "careerPath", label: "Career Path", type: "select", options: CAREER_PATHS, allowCustom: true, full: true, defaultEmpty: true, placeholder: "Select career path (saved to Tracks)" },
    { key: "level", label: "Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced"] },
    { key: "price", label: "Price (₹)", type: "number", required: true, placeholder: "e.g. 45000" },
    { key: "description", label: "About This Course", type: "textarea", required: true, full: true, placeholder: "Long-form description shown on the course detail page…" },
    { key: "whatYoullLearn", label: "What You'll Learn (one per line)", type: "textarea", required: true, full: true, placeholder: "Build production-grade full-stack apps with the MERN stack\nDesign scalable REST APIs with Express.js and Node.js\n…" },
    { key: "techStack", label: "Technologies Covered (comma separated)", type: "text", required: true, full: true, placeholder: "MongoDB, Mongoose, Express.js, React.js, Node.js, Redux Toolkit, JWT Auth" },
    { key: "careerTitle", label: "Career Relevance — Headline", type: "text", required: true, full: true, placeholder: "e.g. High-demand skill — average salary ₹18L – ₹40L/yr" },
    { key: "careerBody", label: "Career Relevance — Body", type: "textarea", required: true, full: true, placeholder: "Companies that hire for this skill, salary context, market demand…" },
    { key: "trainerId", label: "Primary Instructor", type: "select", required: true, optionsFrom: "instructors" },
    { key: "thumbnailUrl", label: "Thumbnail Image", type: "file", required: false, full: true },
    { key: "status", label: "Status", type: "select", required: true, options: ["DRAFT", "ACTIVE", "ARCHIVED"] },
    // Computed from the curriculum — optional, kept at the very end of the form
    { key: "duration", label: "Duration", type: "duration", placeholder: "e.g. 16" },
    { key: "modules", label: "Total Modules", type: "number", placeholder: "e.g. 20" },
    { key: "totalLessons", label: "Total Lessons", type: "number", placeholder: "e.g. 96" },
    { key: "totalHours", label: "Total Duration (hours)", type: "number", placeholder: "e.g. 80" },
  ],
  batches: [
    { key: "code", label: "Batch Code", type: "text", required: true, placeholder: "e.g. BAT-MERN-WD-04" },
    { key: "course", label: "Course", type: "select", required: true, optionsFrom: "courses" },
    { key: "instructor", label: "Instructor", type: "select", required: true, optionsFrom: "instructors" },
    { key: "schedule", label: "Schedule", type: "select", required: true, options: ["Weekday Morning", "Weekday Evening", "Weekend"] },
    { key: "seats", label: "Total Seats", type: "number", required: true, placeholder: "e.g. 30" },
    { key: "enrolled", label: "Enrolled", type: "number", placeholder: "e.g. 24" },
    { key: "startDate", label: "Start Date", type: "date", required: true },
    { key: "status", label: "Status", type: "select", required: true, options: ["Upcoming", "Running", "Completed", "Cancelled"] },
  ],
  instructors: [
    { key: "instId", label: "Instructor ID", type: "text", required: true, placeholder: "e.g. INS-014" },
    { key: "name", label: "Full Name", type: "text", required: true, placeholder: "e.g. Aakash Verma" },
    { key: "specialization", label: "Specialization", type: "select", required: true, options: ["Full Stack", "Data Science", "AI / ML", "DevOps", "Cybersecurity", "Programming", "Cloud"] },
    { key: "email", label: "Email", type: "email", required: true, placeholder: "name@futurestack.in" },
    { key: "phone", label: "Phone", type: "text", placeholder: "+91 98XXXXXXXX" },
    { key: "activeBatches", label: "Active Batches", type: "number", placeholder: "e.g. 2" },
    { key: "rating", label: "Rating (out of 5)", type: "number", placeholder: "e.g. 4.8" },
    { key: "status", label: "Status", type: "select", required: true, options: ["Active", "On Leave", "Inactive"] },
  ],
  feeplans: [
    { key: "code", label: "Plan Code", type: "text", required: true, placeholder: "e.g. FEE-MERN-STD" },
    { key: "name", label: "Plan Name", type: "text", required: true, placeholder: "e.g. MERN Standard Plan" },
    { key: "course", label: "Applicable Course", type: "select", required: true, optionsFrom: "courses" },
    { key: "baseFee", label: "Base Fee (₹)", type: "number", required: true, placeholder: "e.g. 45000" },
    { key: "discountPct", label: "Discount (%)", type: "number", placeholder: "e.g. 10" },
    { key: "emiAvailable", label: "EMI Available", type: "select", required: true, options: ["Yes", "No"] },
    { key: "emiMonths", label: "EMI Months (if any)", type: "number", placeholder: "e.g. 6" },
    { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
  ],
  certs: [
    { key: "code", label: "Template Code", type: "text", required: true, placeholder: "e.g. CERT-MERN-01" },
    { key: "name", label: "Certificate Name", type: "text", required: true, placeholder: "e.g. MERN Stack Professional", full: true },
    { key: "course", label: "Applicable Course", type: "select", required: true, optionsFrom: "courses" },
    { key: "passingPct", label: "Passing %", type: "number", required: true, placeholder: "e.g. 60" },
    { key: "validityYears", label: "Validity (years)", type: "number", placeholder: "e.g. 3" },
    { key: "issuedCount", label: "Issued Count", type: "number", placeholder: "e.g. 120" },
    { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Draft", "Retired"] },
  ],
  departments: [
    { key: "code", label: "Dept Code", type: "text", required: true, placeholder: "e.g. DEPT-SALES" },
    { key: "name", label: "Department Name", type: "text", required: true, placeholder: "e.g. Sales" },
    { key: "head", label: "Department Head", type: "text", placeholder: "e.g. Rohit Sharma" },
    { key: "roles", label: "Roles (comma separated)", type: "text", full: true, placeholder: "e.g. Sales Exec, Sales Lead, Sales Manager" },
    { key: "headcount", label: "Headcount", type: "number", placeholder: "e.g. 12" },
    { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Inactive"] },
  ],
};

/* ───────────────────────────────────────────────
   COLUMN CONFIGS
─────────────────────────────────────────────── */
const COLUMNS: Record<string, ColumnDef[]> = {
  courses: [
    { key: "code", label: "Course Code", mono: true, strong: true },
    { key: "name", label: "Course Name", strong: true },
    { key: "category", label: "Category" },
    { key: "duration", label: "Duration", render: (v) => (v ? `${v} wks` : "—") },
    {
      key: "totalLessons",
      label: "Lessons",
      render: (v, r) => (
        <div className="flex flex-col leading-tight">
          <span className="font-mono">{v ?? "—"}</span>
          {r.totalHours ? (
            <span className="font-mono text-[9px]" style={{ color: "var(--text3)" }}>{`${r.totalHours}h total`}</span>
          ) : null}
        </div>
      ),
    },
    { key: "level", label: "Level" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v === "ACTIVE" ? "Active" : v === "DRAFT" ? "Draft" : v === "ARCHIVED" ? "Archived" : v} /> },
  ],
  batches: [
    { key: "code", label: "Batch Code", mono: true, strong: true },
    { key: "course", label: "Course", mono: true },
    { key: "instructor", label: "Instructor", mono: true },
    { key: "schedule", label: "Schedule" },
    { key: "seats", label: "Seats", render: (v, r) => `${r.enrolled ?? 0}/${v}` },
    { key: "startDate", label: "Start Date", mono: true },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  ],
  instructors: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "specialization", label: "Specialization" },
    { key: "activeBatches", label: "Courses Taught", mono: true },
    { key: "rating", label: "Rating", render: (v) => `${v ?? "—"} ⭐` },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  ],
  feeplans: [
    { key: "code", label: "Plan Code", mono: true, strong: true },
    { key: "name", label: "Plan Name" },
    { key: "course", label: "Course", mono: true },
    { key: "baseFee", label: "Base Fee", render: (v) => `₹${v?.toLocaleString() ?? "—"}` },
    { key: "discountPct", label: "Discount", render: (v) => (v ? `${v}%` : "—") },
    { key: "emiAvailable", label: "EMI", render: (v) => <YesNoBadge value={v} /> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  ],
  certs: [
    { key: "code", label: "Template Code", mono: true, strong: true },
    { key: "name", label: "Certificate Name" },
    { key: "course", label: "Course", mono: true },
    { key: "passingPct", label: "Passing %", render: (v) => `${v}%` },
    { key: "validityYears", label: "Validity", render: (v) => (v ? `${v} yrs` : "Lifetime") },
    { key: "issuedCount", label: "Issued", mono: true },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  ],
  departments: [
    { key: "code", label: "Dept Code", mono: true, strong: true },
    { key: "name", label: "Department" },
    { key: "head", label: "Head" },
    { key: "roles", label: "Roles Defined" },
    { key: "headcount", label: "Headcount", mono: true },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  ],
};

let CURRICULUM_SEED: Record<string, CurriculumEntry> = {};

/* ───────────────────────────────────────────────
   MAIN PAGE
─────────────────────────────────────────────── */
export default function AdminMasterDataPage() {
  const [view, setView] = useState("admin-dashboard");
  const [currentEntity, setCurrentEntity] = useState("courses");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [cbOpen, setCbOpen] = useState(false);
  const [cbCourse, setCbCourse] = useState<{ code: string; name: string; id: string } | null>(null);
  const [rmOpen, setRmOpen] = useState(false);
  const [rmCourse, setRmCourse] = useState<{ code: string; name: string; id: string } | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | number | null>(null);
  const [expandedCurriculums, setExpandedCurriculums] = useState<Record<string|number, any[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);
  const [db, setDb] = useState(DB);
  const [curriculumDb, setCurriculumDb] = useState(CURRICULUM_SEED);
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profileModal, setProfileModal] = useState<{ open: boolean; mode: "profile" | "settings" }>({ open: false, mode: "profile" });
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  // Promise-based styled confirmation popup — replaces window.confirm/alert.
  // Usage: if (!(await askConfirm({ title, message, danger }))) return;
  function askConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setConfirmState({ ...opts, resolve }));
  }

  function resolveConfirm(ok: boolean) {
    confirmState?.resolve(ok);
    setConfirmState(null);
  }

  useEffect(() => {
    (async () => {
      // Staff-only: use the staff token for BOTH identity and data fetches.
      // No student-token fallback — this is a staff portal, so a missing staff
      // session means "not logged in as staff", not "fall back to student".
      // Passing the token explicitly also stops the proxy from leaking the
      // student cookie (fs_token) identity into the admin panel.
      const t = await loadStaffToken().catch(() => null);
      if (!t) {
        window.location.href = "/auth/staff-login";
        return;
      }
      setToken(t);
      try {
        const u = await authApi.me(t ?? undefined);
        setUser({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          initials: u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U",
          phone: "",
          department: "",
          joined: "",
        });
      } catch {
        window.location.href = "/auth/staff-login";
      } finally {
        setSessionLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    headers["Authorization"] = `Bearer ${token}`;

    let cancelled = false;

    Promise.all([
      fetch("/api/admin/stats", { headers }).then(async (r) => { if (!r.ok) throw new Error(await r.json().then((b) => b.message).catch(() => `HTTP ${r.status}`)); return r.json(); }).catch(() => null),
      fetch("/api/courses", { headers }).then(async (r) => { if (!r.ok) throw new Error(await r.json().then((b) => b.message).catch(() => `HTTP ${r.status}`)); return r.json(); }).catch(() => []),
      fetch("/api/admin/trainers/approved", { headers }).then(async (r) => { if (!r.ok) throw new Error(await r.json().then((b) => b.message).catch(() => `HTTP ${r.status}`)); return r.json(); }).catch(() => []),
    ]).then(([statsData, coursesData, trainersData]) => {
      if (cancelled) return;
      if (statsData && typeof statsData.totalCourses === "number") setStats(statsData);

      const mappedCourses = (Array.isArray(coursesData) ? coursesData : []).map((c: any) => ({
        id: c.id,
        _backendId: c.id,
        code: c.code || (typeof c.id === "string" ? c.id.slice(0, 8) : ""),
        title: c.title || "",
        name: c.title || "Untitled",
        description: c.description || "",
        price: c.price ?? 0,
        status: c.status || "DRAFT",
        trainerId: c.trainerId || c.trainer?.id || "",
        category: c.category || (Array.isArray(c.techStack) && c.techStack[0]) || "",
        level: SKILL_LEVEL_LABELS[c.skillLevel] || "",
        duration: c.durationWeeks || 0,
        totalLessons: c.totalLessons ?? 0,
        totalHours: c.totalHours ?? 0,
        modules: c._count?.sections ?? 0,
        instructor: c.trainer?.name || "",
        instructorEmail: c.trainer?.email || "",
        thumbnailUrl: c.thumbnailUrl || "",
        techStack: Array.isArray(c.techStack) ? c.techStack : [],
        whatYoullLearn: Array.isArray(c.whatYoullLearn) ? c.whatYoullLearn : [],
        careerTitle: c.careerTitle || "",
        careerBody: c.careerBody || "",
        careerPath: c.tracks?.[0]?.track.title ?? "",
        enrollments: c._count?.enrollments ?? 0,
      }));
      setDb((prev) => ({ ...prev, courses: mappedCourses }));

      const mappedInstructors = (Array.isArray(trainersData) ? trainersData : []).map((t: any, i: number) => ({
        id: t.id,
        instId: typeof t.id === "string" ? t.id.slice(0, 8) : `INS-${i + 1}`,
        name: t.name || "",
        email: t.email || "",
        specialization: t.bio || t.yearsExperience ? `${t.yearsExperience || 0} yrs exp` : "",
        phone: "",
        activeBatches: t._count?.coursesTaught ?? 0,
        rating: t.rating ?? 0,
        status: "Active",
      }));
      setDb((prev) => ({ ...prev, instructors: mappedInstructors }));
    });
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  /* ── helpers ── */
  const entityData = db[currentEntity] || [];
  const filteredData = useMemo(() => {
    if (!searchQuery) return entityData;
    const q = searchQuery.toLowerCase();
    return entityData.filter((row: any) =>
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [entityData, searchQuery]);

  function getCourseName(code: string) {
    const c = db.courses.find((c: Course) => c.code === code);
    return c ? c.name : code;
  }

  function getInstructorName(id: string) {
    const i = db.instructors.find((i: Instructor) => i.instId === id);
    return i ? i.name : id;
  }

  const extraOptions = useMemo(() => {
    const approvedInstructors = (db.instructors as Instructor[]).map((i) => ({ label: `${i.instId} — ${i.name}`, value: i.id }));
    // A course's assigned trainer may not be in the "approved" list (e.g. approval
    // revoked, or assigned before approval). Still surface them as an option so the
    // dropdown shows the real value instead of appearing blank/unset.
    const approvedIds = new Set(approvedInstructors.map((i) => i.value));
    const unapproved = (db.courses as any[])
      .filter((c) => c.trainerId && !approvedIds.has(c.trainerId))
      .map((c) => ({ label: `${c.instructor || c.trainerId} (not approved)`, value: c.trainerId }));
    const dedupedUnapproved = Array.from(new Map(unapproved.map((o) => [o.value, o])).values());

    return {
      courses: (db.courses as any[]).map((c) => ({ label: c.name || c.title || "", value: c.id })),
      instructors: [...approvedInstructors, ...dedupedUnapproved],
    };
  }, [db]);

  function getDefaultForm(entity: string): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const field of SCHEMAS[entity]) {
      if (field.type === "select" && field.options && !field.defaultEmpty) {
        defaults[field.key] = field.options[0];
      } else {
        defaults[field.key] = "";
      }
    }
    return defaults;
  }

  const tabs: EntityTab[] = useMemo(() => [
    { key: "courses", icon: "📚", label: "Courses", count: db.courses.length },
    { key: "batches", icon: "📅", label: "Batches", count: db.batches.length },
    { key: "instructors", icon: "🎓", label: "Instructors", count: db.instructors.length },
    { key: "feeplans", icon: "💳", label: "Fee Plans", count: db.feeplans.length },
    { key: "certs", icon: "🏅", label: "Certifications", count: db.certs.length },
    { key: "departments", icon: "🏢", label: "Departments", count: db.departments.length },
  ], [db]);

  const kpiItems = useMemo(() => [
    { label: "Courses", value: stats?.totalCourses ?? db.courses.length, delta: `${stats?.activeCourses ?? 0} active`, color: "var(--orange)" },
    { label: "Batches", value: db.batches.length, delta: `${db.batches.filter((b: Batch) => b.status === "Running").length} running`, color: "var(--blue)" },
    { label: "Instructors", value: stats?.totalTrainers ?? db.instructors.length, delta: `${stats?.pendingTrainers ?? 0} pending approval`, color: "var(--purple)" },
    { label: "Fee Plans", value: db.feeplans.length, delta: "configured", color: "var(--green)" },
    { label: "Cert. Templates", value: db.certs.length, delta: "configured", color: "var(--pink)" },
    { label: "Departments", value: db.departments.length, delta: `${db.departments.length} roles`, color: "var(--amber)" },
  ], [db, stats]);

  /* ── Modal handlers ── */
  function openAddModal() {
    setEditingRecord({ ...getDefaultForm(currentEntity), id: null });
    setModalOpen(true);
  }

  function openEditModal(record: any) {
    if (currentEntity === "courses") {
      const mapped: Record<string, any> = {
        id: record.id,
        title: record.title || record.name || "",
        price: record.price ?? 0,
        trainerId: record.trainerId || "",
        description: record.description || "",
        whatYoullLearn: Array.isArray(record.whatYoullLearn) ? record.whatYoullLearn.join("\n") : (record.whatYoullLearn || ""),
        techStack: Array.isArray(record.techStack) ? record.techStack.join(", ") : (record.techStack || ""),
        careerTitle: record.careerTitle || "",
        careerBody: record.careerBody || "",
        careerPath: record.careerPath || "",
        thumbnailUrl: record.thumbnailUrl || "",
        status: record.status || "DRAFT",
        category: record.category || "",
        level: record.level || "",
        duration: record.duration || "",
        totalLessons: record.totalLessons || "",
        totalHours: record.totalHours || "",
        modules: record.modules || "",
      };
      setEditingRecord(mapped);
    } else {
      setEditingRecord({ ...record });
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRecord(null);
  }

  // Cancel/✕/backdrop on the master-data modal — confirm before discarding
  // so the admin can go back to the form instead of losing their input.
  async function requestCloseModal() {
    const ok = await askConfirm({
      title: "Discard Changes?",
      message: "Any unsaved changes in this form will be lost.",
      confirmLabel: "Discard",
      cancelLabel: "Keep Editing",
      danger: true,
    });
    if (ok) closeModal();
  }

  async function saveRecord(formData: Record<string, any>) {
    const draftNote =
      currentEntity === "courses" && formData.status === "DRAFT"
        ? '\n\n📝 Note: This course will be saved as DRAFT — it will NOT be visible to students. Set its status to ACTIVE when you want it visible to all.'
        : "";
    const saveOk = await askConfirm({
      title: formData.id ? `Update ${ENTITY_NAMES[currentEntity]}?` : `Add ${ENTITY_NAMES[currentEntity]}?`,
      message:
        (formData.id
          ? `Save changes to "${formData.title || formData.name || "this record"}"?`
          : `Create new ${ENTITY_NAMES[currentEntity].toLowerCase()} "${formData.title || formData.name || ""}"?`) + draftNote,
      confirmLabel: "💾 Save",
    });
    if (!saveOk) return;

    if (currentEntity === "courses" && token) {
      try {
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        // Persist the career path into the Track table (find-or-create by title
        // + link). Runs after the course create/update so it always has an id.
        const persistCareerPath = async (courseId: string) => {
          if (formData.careerPath === undefined) return;
          try {
            await fetch(`/api/courses/${courseId}/career-path`, {
              method: "PUT",
              headers,
              body: JSON.stringify({ title: formData.careerPath || null }),
            });
          } catch {}
        };

        let whatYoullLearn: string[] | undefined;
        if (typeof formData.whatYoullLearn === "string") {
          whatYoullLearn = formData.whatYoullLearn.split("\n").filter(Boolean);
        } else if (Array.isArray(formData.whatYoullLearn)) {
          whatYoullLearn = formData.whatYoullLearn;
        }

        let techStack: string[] | undefined;
        if (typeof formData.techStack === "string") {
          techStack = formData.techStack.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(formData.techStack)) {
          techStack = formData.techStack;
        }

        const body: Record<string, any> = {};

        if (formData.title !== undefined) body.title = formData.title;
        if (formData.price !== undefined) body.price = Number(formData.price);
        // Only send trainerId when the admin actually changed it — the backend
        // re-validates trainerId as an approved trainer on every update, so
        // resending the unchanged value can fail a save (e.g. Status-only edits)
        // if that trainer's approval status has since changed.
        if (!formData.id || formData.trainerId !== editingRecord?.trainerId) {
          if (formData.trainerId) body.trainerId = formData.trainerId;
        }
        if (formData.description !== undefined) body.description = formData.description;
        if (whatYoullLearn !== undefined) body.whatYoullLearn = whatYoullLearn;
        if (techStack !== undefined) body.techStack = techStack;
        if (formData.careerTitle !== undefined) body.careerTitle = formData.careerTitle;
        if (formData.careerBody !== undefined) body.careerBody = formData.careerBody;
        if (formData.thumbnailUrl !== undefined) body.thumbnailUrl = formData.thumbnailUrl;
        if (formData.status !== undefined) body.status = formData.status;
        if (formData.category) body.category = formData.category;
        if (formData.level && SKILL_LEVEL_ENUM[formData.level]) body.skillLevel = SKILL_LEVEL_ENUM[formData.level];

        if (formData.id) {
          const res = await fetch(`/api/courses/${formData.id}`, {
            method: "PATCH", headers, body: JSON.stringify(body),
          });
          if (res.ok) {
            const updated = await res.json();
            await persistCareerPath(formData.id);
            setDb((prev) => ({
              ...prev,
              courses: prev.courses.map((r: any) =>
                r.id === formData.id
                  ? {
                      ...r,
                      ...body,
                      name: body.title || r.name,
                      level: body.skillLevel ? SKILL_LEVEL_LABELS[body.skillLevel] : r.level,
                      careerPath: formData.careerPath ?? r.careerPath,
                    }
                  : r
              ),
            }));
            addToast(`Course updated successfully`);
          } else {
            const err = await res.json().catch(() => ({}));
            addToast(err.message || "Failed to update course", "danger");
          }
        } else {
          const res = await fetch("/api/courses", {
            method: "POST", headers, body: JSON.stringify(body),
          });
          if (res.ok) {
            const created = await res.json();
            await persistCareerPath(created.id);
            const newCourse = {
              id: created.id, _backendId: created.id,
              name: created.title || body.title,
              title: created.title || body.title,
              description: created.description || "",
              price: created.price ?? 0,
              status: created.status || "DRAFT",
              modules: 0, instructor: "", instructorEmail: "",
              thumbnailUrl: created.thumbnailUrl || "",
              category: created.category || body.category || "",
              level: SKILL_LEVEL_LABELS[created.skillLevel || body.skillLevel] || "",
              duration: 0, totalLessons: 0, totalHours: 0,
              techStack: [], whatYoullLearn: [],
              careerTitle: "", careerBody: "",
              careerPath: formData.careerPath || "",
              enrollments: 0,
            };
            setDb((prev) => ({
              ...prev,
              courses: [newCourse, ...prev.courses],
            }));
            addToast(`Course added successfully`);
          } else {
            const err = await res.json().catch(() => ({}));
            addToast(err.message || "Failed to create course", "danger");
          }
        }
      } catch (e: any) {
        addToast(e.message || "Network error", "danger");
      }
      closeModal();
      return;
    }

    if (formData.id) {
      setDb((prev) => ({
        ...prev,
        [currentEntity]: prev[currentEntity].map((r: any) =>
          r.id === formData.id ? { ...formData } : r
        ),
      }));
      addToast(`${ENTITY_NAMES[currentEntity]} updated successfully`);
    } else {
      const newId = nextId[currentEntity]++;
      setDb((prev) => ({
        ...prev,
        [currentEntity]: [...prev[currentEntity], { ...formData, id: newId }],
      }));
      addToast(`${ENTITY_NAMES[currentEntity]} added successfully`);
    }
    closeModal();
  }

  async function deleteRecord(record: any) {
    const confirmed = await askConfirm({
      title: `Delete ${ENTITY_NAMES[currentEntity]}?`,
      message: `Are you sure you want to delete "${record.name || record.title || record.code}"?\nThis cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    if (currentEntity === "courses" && token) {
      try {
        const res = await fetch(`/api/courses/${record.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (res.ok) {
          setDb((prev) => ({
            ...prev,
            courses: prev.courses.filter((r: any) => r.id !== record.id),
          }));
          addToast(`Course "${record.name || record.title}" deleted`, "danger");
        } else if (res.status === 409) {
          const err = await res.json();
          addToast(err.message || "Cannot delete — course has active enrollments", "danger");
        } else {
          const err = await res.json().catch(() => ({}));
          addToast(err.message || "Failed to delete course", "danger");
        }
      } catch (e: any) {
        addToast(e.message || "Network error", "danger");
      }
      return;
    }

    setDb((prev) => ({
      ...prev,
      [currentEntity]: prev[currentEntity].filter((r: any) => r.id !== record.id),
    }));
    addToast(`${ENTITY_NAMES[currentEntity]} "${record.code || record.name}" deleted`, "danger");
  }

  /* ── Curriculum Builder ── */
  function openCurriculumBuilder(course: any) {
    setCbCourse({ code: course.code, name: course.name, id: course.id });
    setCbOpen(true);
  }

  function openResourceManager(course: any) {
    setRmCourse({ code: course.code, name: course.name, id: course.id });
    setRmOpen(true);
  }

  function saveCurriculum() {
    addToast(`Curriculum saved`);
    if (cbCourse) {
      setExpandedCurriculums((prev) => {
        const next = { ...prev };
        delete next[cbCourse.id];
        return next;
      });
    }
    setCbOpen(false);
    setCbCourse(null);
  }

  function closeCurriculumBuilder() {
    setCbOpen(false);
    setCbCourse(null);
  }

  /* ── Expandable Course Curriculum ── */
  async function handleToggleExpand(courseId: string | number) {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    if (!token) return;
    console.log('[expand] fetching /api/courses/' + courseId, {token: token?.slice(0,10) + '...'});
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      console.log('[expand] status:', res.status, res.statusText);
      if (res.ok) {
        const data = await res.json();
        console.log('[expand] data sections:', data.sections?.length ?? 0, data.sections);
        const sections = (data.sections || []).map((s: any) => ({
          id: s.id, title: s.title || "", order: s.order ?? 0,
          videos: (s.videos || []).map((v: any) => ({ id: v.id, title: v.title || "", durationSeconds: v.durationSeconds ?? 0, order: v.order ?? 0 })),
          quizzes: (s.quizzes || []).map((q: any) => ({ id: q.id, title: q.title || "", totalQuestions: q.totalQuestions ?? 0, order: q.order ?? 0 })),
        }));
        console.log('[expand] mapped sections:', sections);
        setExpandedCurriculums((prev) => ({ ...prev, [courseId]: sections }));
      } else {
        const errBody = await res.json().catch(() => ({}));
        console.warn('[expand] fetch not ok:', res.status, errBody);
      }
    } catch (e) {
      console.warn('[expand] fetch error:', e);
    }
  }

  async function apiPatch(endpoint: string, body: any) {
    if (!token) return;
    await fetch(`/api${endpoint}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function apiDelete(endpoint: string) {
    if (!token) return;
    await fetch(`/api${endpoint}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  function updateSectionTitle(sectionId: string, title: string, courseId: string | number) {
    apiPatch(`/courses/sections/${sectionId}`, { title });
    setExpandedCurriculums((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] || []).map((s) => s.id === sectionId ? { ...s, title } : s),
    }));
  }

  function updateLessonTitle(sectionId: string, lessonId: string, title: string, kind: "video" | "quiz", courseId: string | number) {
    if (kind === "video") {
      apiPatch(`/courses/videos/${lessonId}`, { title });
    } else {
      apiPatch(`/courses/quizzes/${lessonId}`, { title });
    }
    setExpandedCurriculums((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              videos: kind === "video" ? s.videos.map((v: any) => v.id === lessonId ? { ...v, title } : v) : s.videos,
              quizzes: kind === "quiz" ? s.quizzes.map((q: any) => q.id === lessonId ? { ...q, title } : q) : s.quizzes,
            }
          : s
      ),
    }));
  }

  async function deleteSection(sectionId: string, courseId: string | number) {
    const ok = await askConfirm({
      title: "Delete Section?",
      message: "Delete this section and all its videos & quizzes?\nThis cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await apiDelete(`/courses/sections/${sectionId}`);
    setExpandedCurriculums((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] || []).filter((s) => s.id !== sectionId),
    }));
    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((c: any) =>
        c.id === courseId ? { ...c, modules: Math.max(0, (c.modules || 1) - 1) } : c
      ),
    }));
  }

  async function deleteLesson(sectionId: string, lessonId: string, kind: "video" | "quiz", courseId: string | number) {
    const ok = await askConfirm({
      title: kind === "video" ? "Delete Video?" : "Delete Quiz?",
      message: `Are you sure you want to remove this ${kind}?\nThis cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    if (kind === "video") {
      await apiDelete(`/courses/videos/${lessonId}`);
    } else {
      await apiDelete(`/courses/quizzes/${lessonId}`);
    }
    setExpandedCurriculums((prev) => ({
      ...prev,
      [courseId]: (prev[courseId] || []).map((s) =>
        s.id === sectionId
          ? {
              ...s,
              videos: kind === "video" ? s.videos.filter((v: any) => v.id !== lessonId) : s.videos,
              quizzes: kind === "quiz" ? s.quizzes.filter((q: any) => q.id !== lessonId) : s.quizzes,
            }
          : s
      ),
    }));
  }

  function renderExpandedCourse(row: any) {
    const courseId = row.id;
    const sections = expandedCurriculums[courseId] || [];

    if (sections.length === 0) {
      return (
        <div className="px-4 py-3 font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          No curriculum data loaded.
        </div>
      );
    }

    return (
      <div className="px-4 py-3" style={{ maxWidth: "100%" }}>
        {sections.map((section: any, si: number) => {
          const lessons = [
            ...section.videos.map((v: any) => ({ ...v, kind: "video" as const })),
            ...section.quizzes.map((q: any) => ({ ...q, kind: "quiz" as const })),
          ].sort((a: any, b: any) => a.order - b.order);

          return (
            <div
              key={section.id}
              className="rounded mb-2 overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              <div
                className="flex items-center gap-2 px-2.5 py-1.5"
                style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
              >
                <span className="font-mono text-[9px] font-bold shrink-0" style={{ color: "var(--orange)", width: 20 }}>
                  {String(si + 1).padStart(2, "0")}
                </span>
                <input
                  defaultValue={section.title}
                  className="flex-1 text-[11px] font-bold rounded px-1.5 py-0.5 outline-none"
                  style={{
                    color: "var(--text)",
                    background: "transparent",
                    border: "1px solid transparent",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--surface)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "transparent";
                    if (e.currentTarget.value !== section.title) {
                      updateSectionTitle(section.id, e.currentTarget.value, courseId);
                    }
                  }}
                />
                <span className="font-mono text-[9px]" style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                  {lessons.length} lessons
                </span>
                <button
                  onClick={() => deleteSection(section.id, courseId)}
                  className="flex items-center justify-center w-[18px] h-[18px] rounded text-[9px] cursor-pointer"
                  style={{ color: "var(--text3)" }}
                  title="Delete Section"
                >
                  🗑
                </button>
              </div>

              {lessons.length > 0 && (
                <div className="px-2.5 py-1">
                  {lessons.map((lesson: any) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-2 py-0.5"
                    >
                      <span
                        className="font-mono text-[8px] px-1 rounded"
                        style={{
                          color: lesson.kind === "video" ? "var(--green)" : "var(--blue)",
                          background: lesson.kind === "video" ? "var(--green-d)" : "var(--blue-d)",
                        }}
                      >
                        {lesson.kind === "video" ? "VID" : "QUIZ"}
                      </span>
                      <input
                        defaultValue={lesson.title}
                        className="flex-1 text-[10.5px] px-1.5 py-0.5 rounded outline-none"
                        style={{
                          border: "1px solid transparent",
                          background: "transparent",
                          color: "var(--text2)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.background = "var(--bg)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.background = "transparent";
                          if (e.currentTarget.value !== lesson.title) {
                            updateLessonTitle(section.id, lesson.id, e.currentTarget.value, lesson.kind, courseId);
                          }
                        }}
                      />
                      <span className="font-mono text-[8px]" style={{ color: "var(--text3)", whiteSpace: "nowrap" }}>
                        {lesson.kind === "video" ? `${Math.round((lesson.durationSeconds || 0) / 60)}m` : `${lesson.totalQuestions || 0}q`}
                      </span>
                      <button
                        onClick={() => deleteLesson(section.id, lesson.id, lesson.kind, courseId)}
                        className="flex items-center justify-center w-[16px] h-[16px] rounded text-[8px] cursor-pointer"
                        style={{ color: "var(--text3)" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── export ── */
  function exportCurrentEntity() {
    const data = filteredData;
    const headers = Object.keys(data[0] || {}).filter((k) => k !== "id");
    const csv = [
      headers.join(","),
      ...data.map((row: any) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentEntity}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${currentEntity} CSV`);
  }

  /* ── computed display helpers ── */
  function renderCourseInBatch(courseCode: string) {
    return <span className="font-mono text-[10px]" style={{ color: "var(--blue)" }}>{courseCode}</span>;
  }

  function renderInstructorName(id: string) {
    return <span className="font-mono text-[10px]">{getInstructorName(id)}</span>;
  }

  const totalRecords = Object.values(db).reduce((sum: number, arr: any[]) => sum + arr.length, 0);

  if (sessionLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text3)" }} className="font-mono text-[11px]">Checking session…</div>;
  if (!user) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AdminTopbar
        user={user as any}
        currentView={view}
        onSearch={setSearchQuery}
        onMyProfile={() => setProfileModal({ open: true, mode: "profile" })}
        onAccountSettings={() => setProfileModal({ open: true, mode: "settings" })}
                    onSignOut={async () => {
                      await clearStaffToken();
                      await fetch("/api/auth/set-token-staff", { method: "DELETE" });
                      setUser(null);
                      window.location.href = "/auth/staff-login";
                    }}
      />

      <div className="flex" style={{ flex: 1, overflow: "hidden" }}>
        <AdminSidebar activeView={view} onSwitchView={setView} />

        {view === "admin-dashboard" ? (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            <AdminDashboardContent db={db} />
          </main>
        ) : view === "featured" ? (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            <FeaturedManager token={token || ""} />
          </main>

        ) : view === "payment-settings" ? (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            <PaymentSettingsManager token={token || ""} />
          </main>

        ) : view === "payments" ? (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            <PaymentsManager token={token || ""} />
          </main>

        ) : view === "master-data" ? (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            <div className="p-4 pb-7">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                    🗄 Master Data Management
                  </span>
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
                    role::lms_administrator · 6 entities · last_sync: just now
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setRefreshKey(k => k + 1)}
                    className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
                    style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >↻ Refresh</button>
                  <button onClick={exportCurrentEntity}
                    className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
                    style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >⇩ Export CSV</button>
                  <button onClick={openAddModal}
                    className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
                    style={{ background: "var(--orange)", color: "#fff", border: "1px solid var(--orange)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >+ Add New</button>
                </div>
              </div>
              <KpiStrip items={kpiItems} />
              <EntityTabs tabs={tabs} active={currentEntity} onSwitch={setCurrentEntity} />
              <div className="rounded overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}>
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text2)" }}>
                    {ENTITY_ICONS[currentEntity]} {ENTITY_NAMES[currentEntity]}s
                    {currentEntity === "courses" && " & Curriculum"}
                    {currentEntity === "batches" && " & Schedules"}
                    {currentEntity === "instructors" && " / Trainers"}
                    {currentEntity === "feeplans" && " & Discounts"}
                    {currentEntity === "certs" && " Templates"}
                    {currentEntity === "departments" && " / Roles"}
                  </span>
                  <span className="font-mono text-[9.5px]" style={{ color: "var(--text3)" }}>{filteredData.length} records</span>
                </div>
                <div style={{ padding: 0 }}>
                  <EntityTable
                    columns={COLUMNS[currentEntity]} data={filteredData}
                    onEdit={openEditModal} onDelete={deleteRecord}
                    onManageCurriculum={currentEntity === "courses" ? openCurriculumBuilder : undefined}
                    onManageResources={currentEntity === "courses" ? openResourceManager : undefined}
                    emptyMessage={`No ${ENTITY_NAMES[currentEntity].toLowerCase()}s found.`}
                    expandedId={currentEntity === "courses" ? expandedCourseId : undefined}
                    onToggleExpand={currentEntity === "courses" ? handleToggleExpand : undefined}
                    renderExpanded={currentEntity === "courses" ? renderExpandedCourse : undefined}
                  />
                </div>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            {view === "users" && <UsersDashboardContent />}
            {view === "sales" && <SalesDashboardContent />}
            {view === "trainer" && <TrainerDashboardContent />}
            {view === "coordinator" && <CoordinatorDashboardContent />}
            {view === "support" && <SupportDashboardContent />}
            {view === "content-manager" && <ContentMgrDashboardContent />}
          </main>
        )}
      </div>

      <Statusbar recordCount={totalRecords} sessionEmail={user?.email} syncing={sessionLoading} />

      {/* Master Data Modal */}
      <MasterDataModal
        open={modalOpen}
        entity={currentEntity}
        icon={ENTITY_ICONS[currentEntity]}
        title={ENTITY_NAMES[currentEntity]}
        fields={SCHEMAS[currentEntity]}
        data={editingRecord || {}}
        editing={!!editingRecord?.id}
        extraOptions={extraOptions}
        token={token || ""}
        onSave={saveRecord}
        onClose={requestCloseModal}
      />

      {/* Confirmation popup for save / cancel / delete operations */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ""}
        message={confirmState?.message || ""}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        danger={confirmState?.danger}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />

      {/* Curriculum Builder Modal */}
      <CurriculumBuilder
        open={cbOpen}
        courseId={cbCourse?.id || ""}
        courseName={cbCourse?.name || ""}
        courseCode={cbCourse?.code || ""}
        token={token || ""}
        onSave={saveCurriculum}
        onClose={closeCurriculumBuilder}
      />

      {/* Resource Manager Modal */}
      <ResourceManagerModal
        open={rmOpen}
        courseId={rmCourse?.id || ""}
        courseName={rmCourse?.name || ""}
        token={token || ""}
        onClose={() => {
          setRmOpen(false);
          setRmCourse(null);
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        open={profileModal.open}
        mode={profileModal.mode}
        user={user as any}
        onSave={(data) => {
          const updated: any = { ...user, ...data };
          setUser(updated);
          setDb((prev) => ({
            ...prev,
            admins: prev.admins.map((a: any) => a.id === (user as any).id ? { ...a, ...data } : a),
          }));
          try { localStorage.setItem("fs-admin-id", JSON.stringify(updated.id)); } catch {}
          addToast("Profile updated successfully");
        }}
        onClose={() => setProfileModal({ open: false, mode: "profile" })}
      />

      {/* Toasts */}
      <div className="fixed bottom-9 right-4 flex flex-col gap-2 z-[300]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded text-[11.5px] font-semibold min-w-[220px]"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
              color: "var(--text)",
              borderLeft: `3px solid ${t.type === "success" ? "var(--green)" : "var(--red)"}`,
              animation: "toast-in .2s ease",
            }}
          >
            <span style={{ fontSize: 13 }}>{t.type === "success" ? "✓" : "✕"}</span>
            {t.msg}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
