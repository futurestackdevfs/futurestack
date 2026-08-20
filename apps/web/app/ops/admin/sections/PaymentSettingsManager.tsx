"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import CouponsManager from "./CouponsManager";

interface PaymentSettings {
  id: string;
  domesticEnabled: boolean;
  internationalEnabled: boolean;
  trainerSharePercent: number;
  gstPercent: number;
  updatedAt: string;
}

interface TrainerRow {
  id: string;
  name: string;
  email: string;
  role: string;
  trainerSharePercent: number | null;
  createdAt: string;
}

interface PaymentSettingsManagerProps {
  token: string;
  searchQuery?: string;
}

function Toggle({
  label,
  emoji,
  enabled,
  disabled,
  onChange,
  note,
}: {
  label: string;
  emoji: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  note: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-start justify-between gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[16px] shrink-0"
          style={{ background: enabled ? "var(--green-d)" : "var(--bg2)", color: enabled ? "var(--green)" : "var(--text3)" }}
        >
          {emoji}
        </div>
        <div>
          <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{label}</div>
          <div className="text-[11px] mt-0.5 leading-snug max-w-[360px]" style={{ color: "var(--muted)" }}>{note}</div>
        </div>
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className="relative w-[42px] h-[24px] rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-60 shrink-0"
        style={{
          background: enabled ? "var(--green)" : "var(--border2)",
          border: "none",
        }}
        aria-pressed={enabled}
        title={enabled ? "Disable" : "Enable"}
      >
        <span
          className="absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white transition-all duration-200"
          style={{ left: enabled ? "20px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}
        />
      </button>
    </div>
  );
}

function SectionHeader({
  num,
  emoji,
  title,
  desc,
}: {
  num: string;
  emoji: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center font-mono text-[11px] font-extrabold shrink-0"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          {num}
        </span>
        <span className="text-[14px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          {emoji} {title}
        </span>
      </div>
      {desc && (
        <div className="text-[11px] mt-1 leading-snug max-w-[680px]" style={{ color: "var(--muted)" }}>
          {desc}
        </div>
      )}
    </div>
  );
}

const SECTIONS = [
  { id: "channels", num: "01", icon: "💳", label: "Payment & Status" },
  { id: "fees", num: "02", icon: "🧾", label: "Fees & Tax" },
  { id: "trainer-splits", num: "03", icon: "🎓", label: "Trainer Revenue" },
  { id: "coupons", num: "04", icon: "🏷️", label: "Coupons" },
];

export default function PaymentSettingsManager({ token, searchQuery = "" }: PaymentSettingsManagerProps) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCut, setSavingCut] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("channels");
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const load = useCallback(async () => {
    if (!token) return null;
    try {
      const res = await opsFetch("/api/admin/payment-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load payment settings");
      const data = await res.json();
      setSettings(data);
      return data;
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to load payment settings", "danger");
      return null;
    }
  }, [token]);

  const loadTrainers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await opsFetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load trainers");
      const data = (await res.json()) as TrainerRow[];
      setTrainers(Array.isArray(data) ? data.filter((u) => u.role === "TRAINER") : []);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to load trainers", "danger");
    } finally {
      setTrainersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await load();
      if (!cancelled) setLoading(false);
      if (!cancelled && data) setSettings(data);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadTrainers();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function toggle(key: "domesticEnabled" | "internationalEnabled", value: boolean) {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const res = await opsFetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error("Failed to update payment settings");
      const updated = await res.json();
      setSettings(updated);
      addToast("Payment settings updated");
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to update payment settings", "danger");
    }
    setSaving(false);
  }

  async function saveDefaultShare(pct: number) {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const res = await opsFetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trainerSharePercent: pct }),
      });
      if (!res.ok) throw new Error("Failed to update default trainer share");
      const updated = await res.json();
      setSettings(updated);
      addToast(`Default trainer share set to ${pct}%`);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to update default trainer share", "danger");
    }
    setSaving(false);
  }

  async function saveGst(pct: number) {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const res = await opsFetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gstPercent: pct }),
      });
      if (!res.ok) throw new Error("Failed to update GST rate");
      const updated = await res.json();
      setSettings(updated);
      addToast(`GST rate set to ${pct}%`);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to update GST rate", "danger");
    }
    setSaving(false);
  }

  async function saveTrainerOverride(id: string, current: number | null, inputEl: HTMLInputElement | null) {
    const raw = Number(inputEl?.value);
    const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null;
    if (pct === current) return;
    setSavingCut(id);
    try {
      const res = await opsFetch(`/api/admin/trainers/${id}/share`, {
        method: "PATCH",
        body: JSON.stringify({ trainerSharePercent: pct }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const updated = await res.json();
      const share = typeof updated?.trainerSharePercent === "number" ? updated.trainerSharePercent : pct;
      setTrainers((prev) => prev.map((t) => (t.id === id ? { ...t, trainerSharePercent: share } : t)));
      addToast(pct == null ? "Trainer reset to default share" : `Trainer share set to ${pct}%`);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to update trainer share", "danger");
      if (inputEl) inputEl.value = current == null ? "" : String(current);
    } finally {
      setSavingCut(null);
    }
  }

  function scrollToSection(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading && !settings) {
    return (
      <div className="p-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
        Loading payment settings...
      </div>
    );
  }

  const effectiveShare = (t: TrainerRow) =>
    typeof t.trainerSharePercent === "number" ? t.trainerSharePercent : settings?.trainerSharePercent ?? 50;

  const overriddenCount = trainers.filter((t) => typeof t.trainerSharePercent === "number").length;

  return (
    <div className="p-4 pb-16 w-full">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          ⚙ Payment Settings
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          which currencies students can pay with at checkout · trainer revenue splits
        </span>
      </div>

      {settings ? (
        <div className="flex flex-col gap-6 w-full">
          {/* Sticky section navigation */}
          <div
            className="sticky top-0 z-20 rounded-xl px-2 py-1.5 flex flex-wrap items-center gap-1"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}
          >
            {SECTIONS.map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[9.5px] font-bold cursor-pointer"
                  style={{
                    background: isActive ? "var(--orange-d)" : "transparent",
                    color: isActive ? "var(--orange)" : "var(--text2)",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--panel)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span className="w-4 h-4 rounded flex items-center justify-center text-[8.5px] font-extrabold" style={{ background: isActive ? "var(--orange)" : "var(--bg2)", color: isActive ? "#fff" : "var(--text3)" }}>
                    {s.num}
                  </span>
                  {s.icon} {s.label}
                </button>
              );
            })}
            {settings.updatedAt && (
              <span className="ml-auto font-mono text-[9px] hidden sm:block" style={{ color: "var(--text3)" }}>
                last updated {new Date(settings.updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* ── Section 01 · Payment Channels & Currency Status (matching) ── */}
          <section id="channels" className="scroll-mt-20">
            <SectionHeader
              num="01"
              emoji="💳"
              title="Payment Channels & Currency Status"
              desc="Which currencies students can pay with at checkout, and the current availability."
            />
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Toggle
                disabled={saving}
                label="Domestic payments (INR)"
                emoji="₹"
                enabled={settings.domesticEnabled}
                onChange={(v) => toggle("domesticEnabled", v)}
                note="When off, the ₹ INR option is hidden on the cart page and checkout rejects INR orders."
              />
              <Toggle
                disabled={saving}
                label="International payments (USD)"
                emoji="$"
                enabled={settings.internationalEnabled}
                onChange={(v) => toggle("internationalEnabled", v)}
                note="When off, the $ USD option is hidden on the cart page and checkout rejects USD orders."
              />
            </div>
            <div className="mt-3 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] leading-snug" style={{ color: "var(--text3)" }}>
                {settings.domesticEnabled && settings.internationalEnabled ? (
                  <>✅ Students can pay in <strong style={{ color: "var(--text2)" }}>₹ INR</strong> and <strong style={{ color: "var(--text2)" }}>$ USD</strong>.</>
                ) : settings.domesticEnabled ? (
                  <>✅ Only <strong style={{ color: "var(--text2)" }}>₹ INR</strong> payments are available right now — $ USD is disabled.</>
                ) : settings.internationalEnabled ? (
                  <>✅ Only <strong style={{ color: "var(--text2)" }}>$ USD</strong> payments are available right now — ₹ INR is disabled.</>
                ) : (
                  <>⚠️ Both currencies are disabled — checkout is paused until you enable at least one.</>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setLoading(true);
                    Promise.all([load(), loadTrainers()]).finally(() => setLoading(false));
                  }}
                  className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
                >
                  ↻ Refresh
                </button>
                {settings.updatedAt && (
                  <span className="font-mono text-[10px] hidden md:block" style={{ color: "var(--text3)" }}>
                    last updated {new Date(settings.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ── Section 02 · Fees & Tax ── */}
          <section id="fees" className="scroll-mt-20">
            <SectionHeader
              num="02"
              emoji="🧾"
              title="Fees & Tax"
              desc="The GST rate charged on top of every course fee at checkout."
            />
            <div
              className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[16px] shrink-0"
                  style={{ background: "var(--orange-d)", color: "var(--orange)" }}
                >
                  🧾
                </div>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>GST rate</div>
                  <div className="text-[11px] mt-0.5 leading-snug max-w-[420px]" style={{ color: "var(--muted)" }}>
                    Current: {settings.gstPercent ?? 18}%. Charged on (fee − discount), shown as a separate invoice line. Snapshot per order — changing it only affects new purchases.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  disabled={saving}
                  defaultValue={settings.gstPercent}
                  key={settings.gstPercent}
                  className="font-mono text-[12px] px-2 py-1 rounded w-[80px] text-right outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  id="gst-rate-input"
                />
                <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>%</span>
                <button
                  disabled={saving}
                  onClick={() => {
                    const el = document.getElementById("gst-rate-input") as HTMLInputElement | null;
                    const pct = Math.max(0, Math.min(100, Number(el?.value ?? settings.gstPercent)));
                    if (!Number.isFinite(pct)) return;
                    if (pct !== settings.gstPercent) saveGst(Math.round(pct * 10) / 10);
                  }}
                  className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-60"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
                >
                  Save
                </button>
              </div>
            </div>
          </section>

          {/* ── Section 03 · Trainer Revenue (default share + overrides close together) ── */}
          <section id="trainer-splits" className="scroll-mt-20">
            <SectionHeader
              num="03"
              emoji="🎓"
              title="Trainer Revenue Share"
              desc="The default % of each course fee trainers keep, and individual per-trainer overrides."
            />
            <div
              className="rounded-xl p-4 flex items-center justify-between gap-4 mb-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[16px] shrink-0"
                  style={{ background: "var(--purple-d)", color: "var(--purple)" }}
                >
                  📊
                </div>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>Default trainer share</div>
                  <div className="text-[11px] mt-0.5 leading-snug max-w-[420px]" style={{ color: "var(--muted)" }}>
                    Every new trainer inherits this. Locks once revenue has been generated for a trainer — change before the first sale.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={saving}
                  defaultValue={settings.trainerSharePercent}
                  key={settings.trainerSharePercent}
                  className="font-mono text-[12px] px-2 py-1 rounded w-[80px] text-right outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                  id="trainer-share-input"
                />
                <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>%</span>
                <button
                  disabled={saving}
                  onClick={() => {
                    const el = document.getElementById("trainer-share-input") as HTMLInputElement | null;
                    const pct = Math.max(0, Math.min(100, Math.round(Number(el?.value ?? settings.trainerSharePercent))));
                    if (pct !== settings.trainerSharePercent) saveDefaultShare(pct);
                  }}
                  className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer disabled:opacity-60"
                  style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--panel)" }}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {trainersLoading ? (
                <div className="py-8 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>Loading trainers...</div>
              ) : trainers.length === 0 ? (
                <div className="py-8 text-center font-mono text-[10px]" style={{ color: "var(--text3)" }}>No trainers found yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
                        {["Trainer", "Email", "Override", "Effective Share", "Action"].map((h) => (
                          <th key={h} className="font-mono text-[9px] font-bold uppercase tracking-wider text-left px-3 py-2" style={{ color: "var(--text3)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trainers.map((t) => {
                        const eff = effectiveShare(t);
                        const hasOverride = typeof t.trainerSharePercent === "number";
                        return (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--panel)] transition-colors">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                  style={{ background: "linear-gradient(135deg, var(--purple), color-mix(in srgb, var(--purple) 75%, transparent))" }}
                                >
                                  {t.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                                <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{t.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-[10.5px]" style={{ color: "var(--text2)" }}>{t.email}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  defaultValue={t.trainerSharePercent ?? ""}
                                  placeholder="default"
                                  disabled={savingCut === t.id}
                                  className="font-mono text-[10px] px-1.5 py-0.5 rounded w-[56px] text-right outline-none"
                                  style={{ border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
                                  id={`pay-cut-${t.id}`}
                                />
                                <span className="text-[9px]" style={{ color: "var(--text3)" }}>%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-mono text-[10px] font-bold px-1.5 py-[3px] rounded"
                                  style={{
                                    background: hasOverride ? "var(--purple-d)" : "var(--bg2)",
                                    color: hasOverride ? "var(--purple)" : "var(--text3)",
                                  }}
                                >
                                  {eff}%
                                </span>
                                {!hasOverride && (
                                  <span className="font-mono text-[8.5px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                                    default
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={savingCut === t.id}
                                  onClick={() => saveTrainerOverride(t.id, t.trainerSharePercent, document.getElementById(`pay-cut-${t.id}`) as HTMLInputElement | null)}
                                  className="font-mono text-[8.5px] font-semibold px-2 py-0.5 rounded cursor-pointer disabled:opacity-50"
                                  style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
                                >
                                  {savingCut === t.id ? "…" : "Save"}
                                </button>
                                <button
                                  disabled={savingCut === t.id || !hasOverride}
                                  onClick={() => saveTrainerOverride(t.id, t.trainerSharePercent, null)}
                                  className="font-mono text-[8.5px] font-semibold px-2 py-0.5 rounded cursor-pointer disabled:opacity-40"
                                  style={{ border: "1px solid var(--border)", color: "var(--red)", background: "var(--surface)" }}
                                  title="Reset to the default share"
                                >
                                  Reset
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-3.5 py-2.5 font-mono text-[9px]" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)", color: "var(--text3)" }}>
                {trainers.length} trainer{trainers.length === 1 ? "" : "s"} · {overriddenCount} override{overriddenCount === 1 ? "" : "s"} set · {trainers.length - overriddenCount} using the default
              </div>
            </div>
          </section>

          {/* ── Section 04 · Coupons ── */}
          <section id="coupons" className="scroll-mt-20">
            <SectionHeader
              num="04"
              emoji="🏷️"
              title="Coupons & Discounts"
              desc="Create and manage discount codes applied at checkout."
            />
            <CouponsManager token={token} searchQuery={searchQuery} />
          </section>
        </div>
      ) : (
        <div className="rounded-xl p-8 text-center font-mono text-[11px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
          Could not load payment settings.
        </div>
      )}

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
    </div>
  );
}