"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import { authApi } from "@/app/auth/lib/auth-api";
import { AdminTopbar } from "./sections/AdminTopbar";
import { AdminSidebar } from "./sections/AdminSidebar";
import { Statusbar } from "./sections/Statusbar";
import { KpiStrip } from "./sections/KpiStrip";
import { EntityTabs, type EntityTab } from "./sections/EntityTabs";
import { EntityTable, StatusBadge, YesNoBadge, type ColumnDef } from "./sections/EntityTable";
import { MasterDataModal, type FieldDef } from "./sections/MasterDataModal";
import { CurriculumBuilder } from "./sections/CurriculumBuilder";
import { ProfileModal } from "./sections/ProfileModal";
import AdminDashboardContent from "./console/AdminDashboardContent";
import SalesDashboardContent from "./console/SalesDashboardContent";
import TrainerDashboardContent from "./console/TrainerDashboardContent";
import CoordinatorDashboardContent from "./console/CoordinatorDashboardContent";
import SupportDashboardContent from "./console/SupportDashboardContent";
import ContentMgrDashboardContent from "./console/ContentMgrDashboardContent";

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

const ENTITY_NAMES: Record<string, string> = {
  courses: "Course", batches: "Batch", instructors: "Instructor", feeplans: "Fee Plan", certs: "Certification Template", departments: "Department",
};

const SCHEMAS: Record<string, FieldDef[]> = {
  courses: [
    { key: "code", label: "Course Code", type: "text", required: true, placeholder: "e.g. CRS-MERN-01" },
    { key: "name", label: "Course Name", type: "text", required: true, placeholder: "e.g. MERN Stack Development", full: true },
    { key: "category", label: "Category", type: "select", required: true, options: ["Full Stack", "Data Science", "AI / ML", "DevOps", "Cybersecurity", "Programming", "Cloud"] },
    { key: "level", label: "Level", type: "select", required: true, options: ["Beginner", "Intermediate", "Advanced"] },
    { key: "duration", label: "Duration (weeks)", type: "number", required: true, placeholder: "e.g. 16" },
    { key: "modules", label: "Total Modules", type: "number", required: true, placeholder: "e.g. 20" },
    { key: "totalLessons", label: "Total Lessons", type: "number", placeholder: "e.g. 96" },
    { key: "totalHours", label: "Total Duration (hours)", type: "number", placeholder: "e.g. 80" },
    { key: "description", label: "About This Course", type: "textarea", full: true, placeholder: "Long-form description shown on the course detail page…" },
    { key: "learnOutcomes", label: "What You'll Learn (one per line)", type: "textarea", full: true },
    { key: "technologies", label: "Technologies Covered", type: "text", full: true, placeholder: "MongoDB, Express.js, React.js, Node.js" },
    { key: "instructor", label: "Primary Instructor", type: "select", required: true, optionsFrom: "instructors" },
    { key: "status", label: "Status", type: "select", required: true, options: ["Active", "Draft", "Archived"] },
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
    { key: "name", label: "Course Name" },
    { key: "category", label: "Category" },
    { key: "duration", label: "Duration", render: (v) => `${v} weeks` },
    { key: "totalLessons", label: "Lessons", mono: true },
    { key: "level", label: "Level" },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
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
    { key: "instId", label: "ID", mono: true, strong: true },
    { key: "name", label: "Name" },
    { key: "specialization", label: "Specialization" },
    { key: "email", label: "Email" },
    { key: "activeBatches", label: "Active Batches", mono: true },
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
  const [cbCourse, setCbCourse] = useState<{ code: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);
  const [db, setDb] = useState(DB);
  const [curriculumDb, setCurriculumDb] = useState(CURRICULUM_SEED);
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [profileModal, setProfileModal] = useState<{ open: boolean; mode: "profile" | "settings" }>({ open: false, mode: "profile" });

  useEffect(() => {
    authApi.me().then((u) => {
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
    }).catch(() => {
      window.location.href = "/auth/staff-login";
    }).finally(() => {
      setSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    fetch("/api/courses").then((r) => r.json()).then((data: any[]) => {
      if (!Array.isArray(data)) return;
      const mapped = data.map((c: any, i: number) => ({
        id: i + 1,
        code: c.id?.toString() || c.code || `CRS-${i + 1}`,
        name: c.title || c.name || "Untitled",
        category: c.category || "General",
        level: c.level || "Intermediate",
        duration: c.hours || c.duration || 0,
        modules: c.modules || 0,
        totalLessons: c.totalLessons || 0,
        totalHours: c.hours || c.totalHours || 0,
        description: c.description || "",
        learnOutcomes: (c.whatYoullLearn || []).join("\n") || "",
        technologies: Array.isArray(c.techStack) ? c.techStack.join(", ") : (c.technologies || ""),
        careerTitle: c.careerTitle || "",
        careerBody: c.careerBody || "",
        instructor: c.mentorName || "",
        thumbnailLabel: c.title?.split(" ").slice(0, 3).join(" ") || "",
        status: "Active",
      }));
      setDb((prev) => ({ ...prev, courses: mapped }));
      if (mapped.length > 0) nextId.courses = mapped.length + 1;
    }).catch(() => {});
  }, []);

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

  const extraOptions = useMemo(() => ({
    courses: (db.courses as Course[]).map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code })),
    instructors: (db.instructors as Instructor[]).map((i) => ({ label: `${i.instId} — ${i.name}`, value: i.instId })),
  }), [db]);

  function getDefaultForm(entity: string): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const field of SCHEMAS[entity]) {
      if (field.type === "select" && field.options) {
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
    { label: "Courses", value: db.courses.length, delta: `${db.courses.filter((c: Course) => c.status === "Active").length} active`, color: "var(--orange)" },
    { label: "Batches", value: db.batches.length, delta: `${db.batches.filter((b: Batch) => b.status === "Running").length} running`, color: "var(--blue)" },
    { label: "Instructors", value: db.instructors.length, delta: `${db.instructors.filter((i: Instructor) => i.status === "Active").length} active`, color: "var(--purple)" },
    { label: "Fee Plans", value: db.feeplans.length, delta: "configured", color: "var(--green)" },
    { label: "Cert. Templates", value: db.certs.length, delta: "configured", color: "var(--pink)" },
    { label: "Departments", value: db.departments.length, delta: `${db.departments.length} roles`, color: "var(--amber)" },
  ], [db]);

  /* ── Modal handlers ── */
  function openAddModal() {
    setEditingRecord({ ...getDefaultForm(currentEntity), id: null });
    setModalOpen(true);
  }

  function openEditModal(record: any) {
    setEditingRecord({ ...record });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRecord(null);
  }

  function saveRecord(formData: Record<string, any>) {
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

  function deleteRecord(record: any) {
    setDb((prev) => ({
      ...prev,
      [currentEntity]: prev[currentEntity].filter((r: any) => r.id !== record.id),
    }));
    addToast(`${ENTITY_NAMES[currentEntity]} "${record.code || record.name}" deleted`, "danger");
  }

  /* ── Curriculum Builder ── */
  function openCurriculumBuilder(course: any) {
    setCbCourse({ code: course.code, name: course.name });
    setCbOpen(true);
  }

  function saveCurriculum(data: CurriculumEntry) {
    if (cbCourse) {
      setCurriculumDb((prev) => ({ ...prev, [cbCourse.code]: data }));
      addToast(`Curriculum saved for ${cbCourse.name}`);
    }
    setCbOpen(false);
    setCbCourse(null);
  }

  function closeCurriculumBuilder() {
    setCbOpen(false);
    setCbCourse(null);
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
        user={user}
        currentView={view}
        onSearch={setSearchQuery}
        onMyProfile={() => setProfileModal({ open: true, mode: "profile" })}
        onAccountSettings={() => setProfileModal({ open: true, mode: "settings" })}
        onSignOut={async () => {
          await fetch("/api/auth/set-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "" }) });
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
                    emptyMessage={`No ${ENTITY_NAMES[currentEntity].toLowerCase()}s found.`}
                  />
                </div>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
            {view === "sales" && <SalesDashboardContent />}
            {view === "trainer" && <TrainerDashboardContent />}
            {view === "coordinator" && <CoordinatorDashboardContent />}
            {view === "support" && <SupportDashboardContent />}
            {view === "content-manager" && <ContentMgrDashboardContent />}
          </main>
        )}
      </div>

      <Statusbar recordCount={totalRecords} />

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
        onSave={saveRecord}
        onClose={closeModal}
      />

      {/* Curriculum Builder Modal */}
      <CurriculumBuilder
        open={cbOpen}
        courseName={cbCourse?.name || ""}
        courseCode={cbCourse?.code || ""}
        curriculum={
          cbCourse
            ? curriculumDb[cbCourse.code] || { nextSectionId: 1, sections: [] }
            : { nextSectionId: 1, sections: [] }
        }
        onSave={saveCurriculum}
        onClose={closeCurriculumBuilder}
      />

      {/* Profile Modal */}
      <ProfileModal
        open={profileModal.open}
        mode={profileModal.mode}
        user={user}
        onSave={(data) => {
          const updated = { ...user, ...data };
          setUser(updated);
          setDb((prev) => ({
            ...prev,
            admins: prev.admins.map((a: any) => a.id === user.id ? { ...a, ...data } : a),
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
