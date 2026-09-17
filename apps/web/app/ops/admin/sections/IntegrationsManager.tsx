"use client";

import { useCallback, useEffect, useState } from "react";
import { opsFetch } from "../../lib/ops-fetch";

interface IntegrationField {
  name: string;
  present: boolean;
}

interface IntegrationStatus {
  key: string;
  label: string;
  configured: boolean;
  fields: IntegrationField[];
  webhookConfigured?: boolean;
  webhookRoute?: string;
}

const ICONS: Record<string, string> = {
  razorpay: "💳",
  vdocipher: "🎬",
  storage: "🗄",
  google: "🔑",
  email: "✉",
};

interface Props {
  onOpenPaymentSettings?: () => void;
}

export default function IntegrationsManager({ onOpenPaymentSettings }: Props) {
  const [items, setItems] = useState<IntegrationStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await opsFetch("/api/admin/integrations");
      if (!res.ok) throw new Error();
      const data: IntegrationStatus[] = await res.json();
      setItems(data);
      setError(null);
    } catch {
      setError("Could not load integrations status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 pb-7">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            🔌 Integrations
          </span>
          <span className="font-mono text-[10.5px]" style={{ color: "var(--text3)" }}>
            configuration status only · no keys or secrets shown
          </span>
        </div>
        <button
          onClick={load}
          className="font-mono text-[10.5px] font-semibold px-3 py-1 rounded cursor-pointer"
          style={{ border: "1px solid var(--border)", color: "var(--text2)", background: "var(--surface)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
        >↻ Refresh</button>
      </div>

      {error && (
        <div
          className="mb-3.5 px-4 py-3 rounded text-[12px] font-semibold"
          style={{ background: "var(--red-d)", border: "1px solid var(--red)", color: "var(--red)" }}
        >
          {error}
        </div>
      )}

      {loading && !items ? (
        <div className="text-[12px]" style={{ color: "var(--text3)" }}>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items?.map((item) => (
            <div
              key={item.key}
              className="rounded overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="flex items-center gap-2 px-3.5 py-2.5"
                style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-[16px]">{ICONS[item.key] ?? "🔌"}</span>
                <span className="text-[12.5px] font-bold flex-1" style={{ color: "var(--text)" }}>
                  {item.label}
                </span>
                <span
                  className="font-mono text-[9.5px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: item.configured ? "var(--green-d)" : "var(--red-d)",
                    color: item.configured ? "var(--green)" : "var(--red)",
                  }}
                >
                  {item.configured ? "Configured" : "Incomplete"}
                </span>
              </div>

              <div className="px-3.5 py-2.5 flex flex-col gap-1.5">
                {item.fields.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-[11px]">
                    <span style={{ color: f.present ? "var(--green)" : "var(--red)" }}>
                      {f.present ? "✓" : "✗"}
                    </span>
                    <span className="font-mono" style={{ color: "var(--text2)" }}>{f.name}</span>
                  </div>
                ))}

                {item.webhookRoute && (
                  <div
                    className="mt-1.5 pt-1.5 flex items-center gap-2 text-[11px]"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <span style={{ color: item.webhookConfigured ? "var(--green)" : "var(--red)" }}>
                      {item.webhookConfigured ? "✓" : "✗"}
                    </span>
                    <span style={{ color: "var(--text2)" }}>Webhook secret set</span>
                    <span className="font-mono ml-auto" style={{ color: "var(--text3)" }}>
                      {item.webhookRoute}
                    </span>
                  </div>
                )}

                {item.key === "razorpay" && (
                  <button
                    onClick={onOpenPaymentSettings}
                    className="mt-1.5 text-left text-[10.5px] cursor-pointer bg-transparent border-none p-0"
                    style={{ color: "var(--orange)" }}
                  >
                    Business settings (GST%, USD rate, gateway toggles) are managed in Payment Settings →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
