"use client";

export interface SalesProfile {
  name: string;
  email: string;
  phone: string;
  dob: string;
  city: string;
  qualification: string;
  level: string;
  path: string;
  skills: string;
  bio: string;
}

export interface SalesLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  course: string;
  city: string;
  source: string;
  submittedAt: string;
}

const KEYS = {
  theme: "fs-theme",
  profile: "fs-student-profile",
  leads: "fs-leads",
  leadSeen: "fs-lead-seen",
  leadSubmitted: "fs-lead-submitted",
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(KEYS.theme);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

export function applyTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function toggleTheme(current: "light" | "dark"): "light" | "dark" {
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(KEYS.theme, next);
  applyTheme(next);
  return next;
}

export function loadProfile(): SalesProfile {
  const empty: SalesProfile = {
    name: "",
    email: "",
    phone: "",
    dob: "",
    city: "",
    qualification: "",
    level: "Beginner",
    path: "",
    skills: "",
    bio: "",
  };
  if (typeof window === "undefined") return empty;
  return { ...empty, ...safeParse(localStorage.getItem(KEYS.profile), {}) };
}

export function saveProfile(profile: SalesProfile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function getInitials(name: string): string {
  if (!name) return "H";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

export function loadLeads(): SalesLead[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(KEYS.leads), []);
}

export function addLead(lead: Omit<SalesLead, "id" | "submittedAt">): SalesLead {
  const newLead: SalesLead = {
    ...lead,
    id: "LEAD-" + Date.now().toString().slice(-8),
    submittedAt: new Date().toISOString(),
  };
  const existing = loadLeads();
  existing.unshift(newLead);
  localStorage.setItem(KEYS.leads, JSON.stringify(existing));
  return newLead;
}

export function wasLeadSeen(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEYS.leadSeen) === "1";
}

export function markLeadSeen() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.leadSeen, "1");
}

export function wasLeadSubmitted(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEYS.leadSubmitted) === "1";
}

export function markLeadSubmitted() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEYS.leadSubmitted, "1");
}
