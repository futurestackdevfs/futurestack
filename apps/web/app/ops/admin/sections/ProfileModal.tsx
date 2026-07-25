"use client";

import { useState, useEffect } from "react";

interface UserData {
  name: string;
  email: string;
  role: string;
  initials: string;
  phone?: string;
  department?: string;
  joined?: string;
}

interface ProfileModalProps {
  open: boolean;
  mode: "profile" | "settings";
  user: UserData;
  onSave: (data: Partial<UserData>) => void;
  onClose: () => void;
}

export function ProfileModal({ open, mode, user, onSave, onClose }: ProfileModalProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", department: "" });

  useEffect(() => {
    if (open) {
      setForm({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        department: user.department || "Platform Engineering",
      });
    }
  }, [open, user]);

  if (!open) return null;

  const title = mode === "profile" ? "My Profile" : "Account Settings";
  const icon = mode === "profile" ? "👤" : "⚙";

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const initials = form.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
    onSave({ ...form, initials });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          width: 420,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 40px rgba(0,0,0,.2)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span className="text-[13.5px] font-bold" style={{ color: "var(--text)" }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-[13px] cursor-pointer"
            style={{ color: "var(--text3)", border: "1px solid var(--border)", background: "var(--bg)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text3)"; }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Full Name</label>
            <input value={form.name} onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded text-[11.5px] outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--mono)" }} />
          </div>
          <div>
            <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Email</label>
            <input value={form.email} onChange={(e) => handleChange("email", e.target.value)}
              className="w-full px-2.5 py-1.5 rounded text-[11.5px] outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--mono)" }} />
          </div>
          {mode === "profile" && (
            <>
              <div>
                <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Phone</label>
                <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded text-[11.5px] outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--mono)" }} />
              </div>
              <div>
                <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Department</label>
                <input value={form.department} onChange={(e) => handleChange("department", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded text-[11.5px] outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--mono)" }} />
              </div>
            </>
          )}
          {mode === "settings" && (
            <div>
              <label className="font-mono text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text3)" }}>Current Role</label>
              <div className="px-2.5 py-1.5 rounded text-[11.5px]" style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text2)", fontFamily: "var(--mono)" }}>
                {user.role}
              </div>
              <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded" style={{ background: "var(--amber-d)" }}>
                <span style={{ fontSize: 11 }}>🔒</span>
                <span className="text-[10.5px]" style={{ color: "var(--amber)" }}>Role changes require super-admin approval</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button onClick={onClose}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >Cancel</button>
          <button onClick={handleSave}
            className="font-mono text-[10.5px] font-semibold px-3 py-1.5 rounded cursor-pointer"
            style={{ background: "var(--blue)", color: "#fff", border: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >Save Changes</button>
        </div>
      </div>
    </div>
  );
}
