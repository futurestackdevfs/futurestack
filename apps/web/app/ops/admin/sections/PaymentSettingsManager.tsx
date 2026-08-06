"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "@/app/ops/lib/ops-fetch";
import CouponsManager from "./CouponsManager";

interface PaymentSettings {
  id: string;
  domesticEnabled: boolean;
  internationalEnabled: boolean;
  updatedAt: string;
}

interface PaymentSettingsManagerProps {
  token: string;
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

export default function PaymentSettingsManager({ token }: PaymentSettingsManagerProps) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "danger" }[]>([]);

  function addToast(msg: string, type: "success" | "danger" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const load = useCallback(async () => {
    if (!token) return;
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

  if (loading && !settings) {
    return (
      <div className="p-8 text-center font-mono text-[11px]" style={{ color: "var(--text3)" }}>
        Loading payment settings...
      </div>
    );
  }

  return (
    <div className="p-4 pb-16">
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          ⚙ Payment Settings
        </span>
        <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
          which currencies students can pay with at checkout
        </span>
      </div>

      {settings ? (
        <>
          <div className="flex flex-col gap-3 mb-5">
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

          <div className="rounded-lg px-3.5 py-2.5 text-[11px]" style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text3)" }}>
            {settings.domesticEnabled && settings.internationalEnabled ? (
              <>Students can pay in ₹ INR and $ USD.</>
            ) : settings.domesticEnabled ? (
              <>Only ₹ INR payments are available right now — $ USD is disabled.</>
            ) : settings.internationalEnabled ? (
              <>Only $ USD payments are available right now — ₹ INR is disabled.</>
            ) : (
              <>Both currencies are disabled — checkout is paused until you enable at least one.</>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => {
                setLoading(true);
                load().finally(() => setLoading(false));
              }}
              className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
            >
              ↻ Refresh
            </button>
            {settings.updatedAt && (
              <span className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                last updated {new Date(settings.updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          <div className="h-px my-6" style={{ background: "var(--border)" }} />
          <CouponsManager token={token} />
        </>
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
