"use client";

import { useState, useEffect } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import { TRAINER_CAREER_PATHS } from "../lib/data";

interface TrainerProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  bio: string | null;
  phone: string | null;
  dob: string | null;
  city: string | null;
  qualification: string | null;
  experience: string | null;
  careerPath: string | null;
  skills: string[];
  yearsExperience: string | null;
  rating: number;
  stats: { courseCount: number; certificateCount: number };
}

export default function TrainerProfileView({ userName }: { userName: string }) {
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    phone: "", dob: "", city: "", qualification: "", experience: "", careerPath: "", skills: "", bio: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await opsFetch("/api/trainer/profile").then((r) => (r.ok ? r.json() : null));
        if (!cancelled && data) {
          setProfile(data);
          setForm({
            phone: data.phone ?? "",
            dob: data.dob ?? "",
            city: data.city ?? "",
            qualification: data.qualification ?? "",
            experience: data.experience?.toLowerCase() ?? "",
            careerPath: data.careerPath ?? "",
            skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
            bio: data.bio ?? "",
          });
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await opsFetch("/api/trainer/profile", {
        method: "PUT",
        body: JSON.stringify({
          phone: form.phone || undefined,
          dob: form.dob || undefined,
          city: form.city || undefined,
          qualification: form.qualification || undefined,
          experience: form.experience ? form.experience.toUpperCase() : undefined,
          careerPath: form.careerPath || undefined,
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
          bio: form.bio || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await opsFetch("/api/trainer/avatar", { method: "POST", body: fd, headers: {} });
      if (res.ok) {
        const { avatarUrl } = await res.json();
        setProfile((prev) => prev ? { ...prev, avatarUrl } : prev);
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const joined = new Date(profile.createdAt).getFullYear();
  const inputClass = "w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-all duration-200 focus:border-orange-400 focus:shadow-[0_0_0_3px_var(--orange-d)] placeholder:text-[var(--text3)]";
  const labelClass = "text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider block mb-1.5";

  return (
    <div className="p-4 pb-7 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden mb-6">
        <div className="p-6 flex items-center gap-5" style={{ background: "linear-gradient(135deg, var(--orange-d) 0%, transparent 60%)" }}>
          <div className="relative shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-20 h-20 rounded-full object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {initials}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] cursor-pointer shadow-md" style={{ background: "var(--orange)", color: "#fff" }}>
              ✎
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text)] truncate">{profile.name}</h1>
            <p className="text-sm text-[var(--text3)] mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2.5 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--purple-d)", color: "var(--purple)" }}>{profile.role}</span>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>Joined {joined}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-extrabold text-[var(--text)]">{profile.stats?.courseCount ?? 0}</div>
              <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Courses</div>
            </div>
            <div className="w-px h-8" style={{ background: "var(--border)" }} />
            <div className="text-center">
              <div className="text-lg font-extrabold text-[var(--text)]">⭐ {profile.rating}</div>
              <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Personal Details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between" style={{ background: "var(--panel)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--blue-d)", color: "var(--blue)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Personal Details</h2>
              </div>
              <span className="text-[10px]" style={{ color: "var(--text3)" }}>6 fields</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" value={profile.name} disabled className={inputClass + " opacity-60 cursor-not-allowed"} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={profile.email} disabled className={inputClass + " opacity-60 cursor-not-allowed"} />
              </div>
              <div>
                <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" name="dob" value={form.dob} onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>City <span className="text-red-500">*</span></label>
                <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Mumbai, Maharashtra" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Qualification <span className="text-red-500">*</span></label>
                <input type="text" name="qualification" value={form.qualification} onChange={handleChange} placeholder="e.g. B.Tech Computer Science" required className={inputClass} />
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between" style={{ background: "var(--panel)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--orange-d)", color: "var(--orange)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                </div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Professional Details</h2>
              </div>
              <span className="text-[10px]" style={{ color: "var(--text3)" }}>3 fields</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Experience Level <span className="text-red-500">*</span></label>
                <select name="experience" value={form.experience} onChange={handleChange} required className={inputClass + " appearance-none cursor-pointer"}>
                  <option value="" disabled>Select experience level</option>
                  <option value="beginner">Beginner (0–2 yrs)</option>
                  <option value="intermediate">Intermediate (2–5 yrs)</option>
                  <option value="advanced">Advanced (5+ yrs)</option>
                </select>
                <p className="mt-1 text-[10.5px]" style={{ color: "var(--text3)" }}>Beginner: 0–2 yrs · Intermediate: 2–5 yrs · Advanced: 5+ yrs of relevant teaching/industry experience</p>
              </div>
              <div>
                <label className={labelClass}>Career Path <span className="text-red-500">*</span></label>
                <select name="careerPath" value={form.careerPath} onChange={handleChange} required className={inputClass + " appearance-none cursor-pointer"}>
                  <option value="" disabled>Select career path</option>
                  {TRAINER_CAREER_PATHS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Skills <span className="font-normal normal-case" style={{ color: "var(--text3)" }}>(comma separated) <span className="text-red-500">*</span></span></label>
                <textarea name="skills" value={form.skills} onChange={handleChange} rows={2} required placeholder="e.g. React, TypeScript, Node.js, Python, AWS" className={inputClass + " resize-none"} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Bio <span className="text-red-500">*</span></label>
                <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} required placeholder="Tell us about your teaching experience and expertise…" className={inputClass + " resize-none"} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Profile Summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)]" style={{ background: "var(--panel)" }}>
              <h2 className="text-sm font-semibold text-[var(--text)]">Profile Summary</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text3)" }}>Experience</span>
                <span className="text-sm font-semibold text-[var(--text)] capitalize">{form.experience || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text3)" }}>Career Path</span>
                <span className="text-sm font-semibold text-[var(--text)] capitalize">{form.careerPath || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text3)" }}>Skills</span>
                <span className="text-sm font-semibold text-[var(--text)]">
                  {form.skills ? form.skills.split(",").filter((s) => s.trim()).length + " skills" : "0"}
                </span>
              </div>
              {form.skills && (
                <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  {form.skills.split(",").slice(0, 4).map((s) => s.trim()).filter(Boolean).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 text-[10px] font-medium rounded-md" style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}>{skill}</span>
                  ))}
                  {form.skills.split(",").filter((s) => s.trim()).length > 4 && (
                    <span className="px-2 py-0.5 text-[10px] font-medium" style={{ color: "var(--text3)" }}>+{form.skills.split(",").filter((s) => s.trim()).length - 4}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[var(--border)]" style={{ background: "var(--panel)" }}>
              <h2 className="text-sm font-semibold text-[var(--text)]">Teaching Stats</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text3)" }}>Courses Taught</span>
                <span className="text-sm font-bold text-[var(--text)]">{profile.stats?.courseCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text3)" }}>Certificates Issued</span>
                <span className="text-sm font-bold text-[var(--text)]">{profile.stats?.certificateCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text3)" }}>Rating</span>
                <span className="text-sm font-bold text-[var(--text)]">⭐ {profile.rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
        {saved && (
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--green)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(to right, var(--blue), var(--orange))" }}
        >
          {saving ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          )}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
