"use client";

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from Anthropic's prompt cache — billed at ~10% of input price. */
  cacheReadTokens: number;
  /** Tokens written to the cache this run — billed at ~125% of input price, paid back by later hits. */
  cacheWriteTokens: number;
}

/**
 * Token/prompt-cache usage for one AI generation call — shown after every
 * blog article / course roadmap generation so cost is visible in the admin
 * UI itself, not just in server logs. Shared by BlogManager and
 * CourseRoadmapTab since both features go through the same AiProviderService
 * and return the same usage shape.
 */
export function AiUsageBlock({ usage }: { usage: AiUsage }) {
  const cachePct = usage.inputTokens > 0 ? Math.round((usage.cacheReadTokens / usage.inputTokens) * 100) : 0;
  const row = (label: string, value: string | number) => (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--text3, var(--text))" }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
  return (
    <div
      className="text-[11px] leading-relaxed px-3 py-2.5 rounded-lg flex flex-col gap-1"
      style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-semibold uppercase tracking-wide text-[10px]" style={{ color: "var(--text)" }}>Token usage</span>
        <span className="font-mono text-[10px]" style={{ color: "var(--text3, var(--text))" }}>{usage.model}</span>
      </div>
      {row("Input tokens", usage.inputTokens.toLocaleString())}
      {row("Output tokens", usage.outputTokens.toLocaleString())}
      {usage.cacheReadTokens > 0 || usage.cacheWriteTokens > 0 ? (
        <>
          {row("Cache read (≈90% cheaper)", usage.cacheReadTokens.toLocaleString())}
          {row("Cache written", usage.cacheWriteTokens.toLocaleString())}
          {usage.cacheReadTokens > 0 && row("Cache hit rate", `${cachePct}%`)}
        </>
      ) : (
        <div style={{ color: "var(--text3, var(--text))" }}>No prompt cache hit this run (first call, or cache expired).</div>
      )}
    </div>
  );
}
