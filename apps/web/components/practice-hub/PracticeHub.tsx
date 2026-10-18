"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CHALLENGES, LANGS, TOTAL_TESTS, type Challenge, type Lang } from "./data";
import { generate, type Generated } from "./codegen";
import {
  AbortRun,
  runChallenge,
  type Issue,
  type LogLine,
  type Mode,
  type RunResult,
  type RunnerHost,
  type StepState,
} from "./engine";
import { SECTIONS } from "./sections";
import { ManualSession, type ManualView } from "./manual";
import { slot, usePracticeStore, type Attempt } from "./store";

/* ───────────────────────── small bits ───────────────────────── */

const card = "rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]";

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    check: "M5 13l4 4L19 7",
    x: "M6 6l12 12M18 6L6 18",
    minus: "M6 12h12",
    play: "M7 5l12 7-12 7V5z",
    pause: "M8 5v14M16 5v14",
    stop: "M6 6h12v12H6z",
    step: "M6 5l9 7-9 7V5zM18 5v14",
    reset: "M4 4v6h6M20 20v-6h-6M5.6 15A8 8 0 0018.4 9M18.4 9L20 10M5.6 15L4 14",
    search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
    target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
    bug: "M9 9a3 3 0 016 0v6a3 3 0 01-6 0V9zM4 13h3M17 13h3M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2M10 4l1 2M14 4l-1 2",
    bolt: "M13 3L5 14h6l-1 7 8-11h-6l1-7z",
    copy: "M9 9h10v10H9zM5 15V5h10",
    alert: "M12 8v5M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
    clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
    code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
    globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4 shrink-0", className)} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

const DIFF_STYLE: Record<Challenge["difficulty"], string> = {
  Easy: "bg-[var(--green-d)] text-[var(--green)]",
  Medium: "bg-[var(--amber-d)] text-[var(--amber)]",
  Hard: "bg-[var(--red-d)] text-[var(--red)]",
};

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

function Ring({ value, size = 76, stroke = 7, label, onDark }: { value: number; size?: number; stroke?: number; label?: string; onDark?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 100 ? "var(--green)" : value > 0 ? "var(--orange)" : onDark ? "rgba(255,255,255,.25)" : "var(--border2)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={onDark ? "rgba(255,255,255,.12)" : "var(--border)"} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(value, 100)) / 100} style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center text-sm font-bold", onDark ? "text-white" : "text-[var(--text)]")}>{label ?? `${Math.round(value)}%`}</div>
    </div>
  );
}

function StepIcon({ status }: { status: StepState["status"] }) {
  if (status === "running") {
    return <span className="mt-0.5 h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-[var(--orange-d)] border-t-[var(--orange)]" />;
  }
  const map = {
    pass: { icon: "check", cls: "bg-[var(--green)] text-white" },
    fail: { icon: "x", cls: "bg-[var(--red)] text-white" },
    skipped: { icon: "minus", cls: "bg-[var(--border2)] text-[var(--text2)]" },
    idle: { icon: "", cls: "border-2 border-[var(--border2)]" },
  } as const;
  const m = map[status];
  return (
    <span className={cn("mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full", m.cls)}>
      {m.icon && <Icon name={m.icon} className="h-3 w-3" />}
    </span>
  );
}

const fmtAgo = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/* ───────────────────────── derived progress ───────────────────────── */

interface Progress {
  best: Record<string, number>;
  solved: Set<string>;
  attemptsBy: Record<string, Attempt[]>;
  bugsCaught: number;
}

function buildProgress(attempts: Attempt[]): Progress {
  const best: Record<string, number> = {};
  const solved = new Set<string>();
  const attemptsBy: Record<string, Attempt[]> = {};
  let bugsCaught = 0;
  for (const a of attempts) {
    (attemptsBy[a.challengeId] ??= []).push(a);
    if (a.mode === "bug" && a.passed < a.total) bugsCaught++;
    if (a.mode !== "healthy" || a.partial) continue;
    best[a.challengeId] = Math.max(best[a.challengeId] ?? 0, a.passed);
    if (a.passed === a.total) solved.add(a.challengeId);
  }
  return { best, solved, attemptsBy, bugsCaught };
}

const SPEEDS: [number, string][] = [[1, "1×"], [2, "2×"], [4, "4×"], [0, "Step"]];

interface Pointer {
  x: number;
  y: number;
  pulse: number;
  visible: boolean;
}

type Pane = "challenges" | "live" | "results";

/* ───────────────────────── main ───────────────────────── */

export default function PracticeHub() {
  const { store, ready, setLang, setSpeed, recordRun, clearChallenge, resetAll } = usePracticeStore();
  const [activeId, setActiveId] = useState(CHALLENGES[0].id);
  const [mode, setMode] = useState<Mode>("healthy");
  const [pane, setPane] = useState<Pane>("live");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | Challenge["difficulty"] | "Solved">("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [run, setRun] = useState<"idle" | "running" | "paused" | "manual">("idle");
  const [runMode, setRunMode] = useState<"auto" | "manual">("auto");
  const [manualView, setManualView] = useState<ManualView | null>(null);
  const [awaitingStep, setAwaitingStep] = useState(false);
  const [live, setLive] = useState<{ owner: string; steps: Record<string, StepState> } | null>(null);
  const [finished, setFinished] = useState<{ owner: string; result: RunResult } | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [pointer, setPointer] = useState<Pointer>({ x: 0, y: 0, pulse: 0, visible: false });

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const speedRef = useRef(store.speed);
  const stepResolver = useRef<(() => void) | null>(null);
  const sessionRef = useRef<ManualSession | null>(null);
  const marked = useRef<{ el: HTMLElement; outline: string; offset: string } | null>(null);

  useEffect(() => {
    speedRef.current = store.speed;
  }, [store.speed]);

  const lang = store.lang;
  const challenge = CHALLENGES.find((c) => c.id === activeId) ?? CHALLENGES[0];
  const ownerKey = slot(challenge.id, mode);
  const running = run !== "idle";
  const Section = SECTIONS[challenge.id];

  const progress = useMemo(() => buildProgress(store.attempts), [store.attempts]);
  const gen = useMemo(() => generate(lang, challenge), [lang, challenge]);

  const lastResult = store.last[ownerKey];
  const result = finished?.owner === ownerKey ? finished.result : lastResult;
  const stepStates = useMemo<Record<string, StepState>>(() => {
    if (live && live.owner === ownerKey) return live.steps;
    const m: Record<string, StepState> = {};
    lastResult?.tests.forEach((t) => t.steps.forEach((s) => (m[s.id] = { status: s.status, waited: s.waited, message: s.message, hint: s.hint })));
    return m;
  }, [live, ownerKey, lastResult]);

  const tcStatus = (tcId: string): "idle" | "running" | "passed" | "failed" | "partial" => {
    const tc = challenge.tests.find((t) => t.id === tcId)!;
    const sts = tc.steps.map((s) => stepStates[s.id]?.status ?? "idle");
    if (sts.includes("fail")) return "failed";
    if (sts.includes("running")) return "running";
    if (sts.every((x) => x === "pass")) return "passed";
    if (sts.some((x) => x === "pass")) return "partial";
    return "idle";
  };
  const tcPassed = challenge.tests.filter((t) => tcStatus(t.id) === "passed").length;
  const tcFailed = challenge.tests.filter((t) => tcStatus(t.id) === "failed").length;

  let stuck: { tc: (typeof challenge.tests)[number]; step: (typeof challenge.tests)[number]["steps"][number]; st: StepState } | null = null;
  for (const tc of challenge.tests) {
    const bad = tc.steps.find((s) => stepStates[s.id]?.status === "fail");
    if (bad) {
      stuck = { tc, step: bad, st: stepStates[bad.id] };
      break;
    }
  }

  const stats = useMemo(() => {
    const testsPassed = CHALLENGES.reduce((n, c) => n + (progress.best[c.id] ?? 0), 0);
    return {
      solved: progress.solved.size,
      testsPassed,
      runs: store.attempts.length,
      bugs: progress.bugsCaught,
      overall: Math.round((testsPassed / TOTAL_TESTS) * 100),
    };
  }, [progress, store.attempts.length]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHALLENGES.filter((c) => {
      if (q && !`${c.title} ${c.section} ${c.summary}`.toLowerCase().includes(q)) return false;
      if (filter === "Easy" || filter === "Medium" || filter === "Hard") {
        if (c.difficulty !== filter) return false;
      }
      const solved = progress.solved.has(c.id);
      if (filter === "Solved" && !solved) return false;
      return true;
    });
  }, [query, filter, progress]);

  /* ── pointer + highlight ── */

  function clearMark() {
    const m = marked.current;
    if (m) {
      m.el.style.outline = m.outline;
      m.el.style.outlineOffset = m.offset;
      marked.current = null;
    }
  }

  function movePointer(el: Element | null, pulse = false) {
    clearMark();
    if (!el) {
      setPointer((p) => ({ ...p, visible: false }));
      return;
    }
    const sc = scrollerRef.current;
    const wrap = wrapRef.current;
    const rectOf = (e: Element) => {
      const r = e.getBoundingClientRect();
      const fe = e.ownerDocument.defaultView?.frameElement;
      if (fe) {
        const fr = fe.getBoundingClientRect();
        return { left: r.left + fr.left, top: r.top + fr.top, width: r.width, height: r.height };
      }
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    };
    if (sc && wrap) {
      const sr = sc.getBoundingClientRect();
      let r = rectOf(el);
      if (r.top < sr.top + 24 || r.top + r.height > sr.bottom - 24) {
        sc.scrollTop += r.top + r.height / 2 - (sr.top + sr.height / 2);
        r = rectOf(el);
      }
      const wr = wrap.getBoundingClientRect();
      setPointer((p) => ({ x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top, pulse: pulse ? p.pulse + 1 : p.pulse, visible: true }));
    }
    const h = el as HTMLElement;
    if (h.style) {
      marked.current = { el: h, outline: h.style.outline, offset: h.style.outlineOffset };
      h.style.outline = "2px solid var(--orange)";
      h.style.outlineOffset = "2px";
    }
  }

  /* ── run control ── */

  async function gate() {
    if (speedRef.current === 0) {
      setAwaitingStep(true);
      await new Promise<void>((r) => {
        stepResolver.current = r;
      });
      setAwaitingStep(false);
    }
    while (pauseRef.current && !abortRef.current) await new Promise((r) => window.setTimeout(r, 100));
  }

  function makeHost(owner: string): RunnerHost {
    return {
      root: () => rootRef.current,
      reset: async () => {
        setEpoch((e) => e + 1);
        await new Promise((r) => window.setTimeout(r, 170));
      },
      speed: () => speedRef.current || 1,
      aborted: () => abortRef.current,
      gate,
      pointer: movePointer,
      onStep: (id, st) => setLive((prev) => (prev && prev.owner === owner ? { owner, steps: { ...prev.steps, [id]: st } } : prev)),
      log: (l) => setLogs((p) => [...p, l]),
    };
  }

  function stop() {
    abortRef.current = true;
    stepResolver.current?.();
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
      setManualView(null);
      setRun("idle");
      movePointer(null);
    }
  }

  async function start(onlyTest?: string) {
    if (running || !ready) return;
    abortRef.current = false;
    pauseRef.current = false;
    setRun("running");
    setLogs([]);
    setFinished(null);
    const owner = ownerKey;
    setLive({ owner, steps: {} });
    const host = makeHost(owner);
    try {
      const res = await runChallenge(challenge, host, mode, onlyTest);
      recordRun(res);
      setFinished({ owner, result: res });
    } catch (e) {
      if (!(e instanceof AbortRun)) console.error(e);
      else setLogs((p) => [...p, { level: "warn", text: "■ Run stopped" }]);
    } finally {
      setRun("idle");
      setAwaitingStep(false);
      movePointer(null);
    }
  }

  /** The learner does the steps; the hub watches the live page and checks each one. */
  function startManual(onlyTest?: string) {
    if (running || !ready) return;
    abortRef.current = false;
    pauseRef.current = false;
    setRun("manual");
    setLogs([]);
    setFinished(null);
    setPane("live");
    const owner = ownerKey;
    setLive({ owner, steps: {} });
    const ids = challenge.tests.filter((tc) => !onlyTest || tc.id === onlyTest).map((tc) => tc.id);
    const session = new ManualSession(challenge, mode, ids, {
      runner: makeHost(owner),
      onView: setManualView,
      onFinish: (res) => {
        recordRun(res);
        setFinished({ owner, result: res });
        sessionRef.current = null;
        setRun("idle");
        setManualView(null);
        movePointer(null);
      },
    });
    sessionRef.current = session;
    void session.start();
  }

  function togglePause() {
    pauseRef.current = !pauseRef.current;
    setRun(pauseRef.current ? "paused" : "running");
  }

  function freshPage() {
    stop();
    movePointer(null);
    setEpoch((e) => e + 1);
  }

  function pick(id: string) {
    if (id === activeId) return;
    freshPage();
    setLive(null);
    setLogs([]);
    setActiveId(id);
    setPane("live");
  }

  function switchMode(m: Mode) {
    if (m === mode) return;
    freshPage();
    setLive(null);
    setLogs([]);
    setMode(m);
  }

  return (
    <main className="w-full bg-[var(--bg)] text-[var(--text)]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[var(--hero-bg)] text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-[var(--orange)] opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-[var(--blue)] opacity-20 blur-3xl" />
        <div className="relative w-full px-3 py-3 sm:px-4 lg:py-4 2xl:px-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div>
              <Badge className="bg-white/10 text-white/80"><Icon name="bolt" className="h-3 w-3" /> Automation Practice Hub</Badge>
              <h1 className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl lg:text-3xl">
                Watch real scripts run. <span className="text-[var(--orange2)]">See exactly where they break.</span>
              </h1>
              <p className="mt-1 max-w-3xl text-xs text-white/70 sm:text-sm">
                Every challenge is a live page with a ready-made script in six frameworks. Let it run on <b className="text-white">Auto</b>, or switch to <b className="text-white">Manual</b> and do the steps yourself — the hub checks each one. Flip on <b className="text-white">Inject bug</b> to see where a failing test gets stuck.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <HeroStat label="Challenges solved" value={`${stats.solved}/${CHALLENGES.length}`} />
                <HeroStat label="Test cases passed" value={`${stats.testsPassed}/${TOTAL_TESTS}`} />
                <HeroStat label="Runs" value={String(stats.runs)} />
                <HeroStat label="Bugs caught" value={String(stats.bugs)} />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur">
              <div className="flex items-center gap-4">
                <Ring value={stats.overall} size={56} stroke={5} onDark />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Overall progress</div>
                  <div className="text-xs text-white/60">Best healthy run per challenge</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mobile pane switcher ── */}
      <div className="sticky top-[56px] z-30 border-b border-[var(--border)] bg-[var(--surface)] xl:hidden">
        <div className="grid grid-cols-3">
          {(["challenges", "live", "results"] as Pane[]).map((p) => (
            <button key={p} onClick={() => setPane(p)} className={cn("py-3 text-sm font-semibold capitalize", pane === p ? "border-b-2 border-[var(--orange)] text-[var(--orange)]" : "text-[var(--muted)]")}>
              {p === "live" ? "Live run" : p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Workspace ── */}
      <section className="w-full px-3 py-4 sm:px-4 2xl:px-5">
        <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)_350px] 2xl:grid-cols-[300px_minmax(0,1fr)_400px]">
          {/* Challenges */}
          <aside className={cn(pane === "challenges" ? "block" : "hidden", "xl:block")}>
            <div className={cn(card, "p-4 xl:sticky xl:top-[72px]")}>
              {/* mobile: filters hide behind an arrow */}
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold xl:hidden"
              >
                <span className="flex items-center gap-2"><Icon name="search" className="text-[var(--muted)]" /> Search & filter{filter !== "All" || query ? <span className="h-2 w-2 rounded-full bg-[var(--orange)]" /> : null}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className={cn(filtersOpen ? "mt-3 block" : "hidden", "xl:mt-0 xl:block")}>
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search challenges…" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--orange)]" />
                </div>
                <div className="mt-3 flex flex-nowrap gap-1">
                  {(["All", "Easy", "Medium", "Hard", "Solved"] as const).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
                </div>
              </div>
              <ul className="mt-3 max-h-[calc(100vh-300px)] min-h-[200px] space-y-1.5 overflow-y-auto pr-1">
                {visible.length === 0 && <li className="py-6 text-center text-sm text-[var(--muted)]">No challenges match.</li>}
                {visible.map((c, i) => {
                  const best = progress.best[c.id] ?? 0;
                  const solved = progress.solved.has(c.id);
                  const tries = progress.attemptsBy[c.id]?.length ?? 0;
                  return (
                    <li key={c.id}>
                      <button onClick={() => pick(c.id)} className={cn("w-full rounded-xl border p-3 text-left transition", activeId === c.id ? "border-[var(--orange)] bg-[var(--orange-d)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)] hover:bg-[var(--card-hover)]")}>
                        <div className="flex items-start gap-2.5">
                          <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", solved ? "bg-[var(--green)] text-white" : "bg-[var(--bg2)] text-[var(--text2)]")}>
                            {solved ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{c.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge className={DIFF_STYLE[c.difficulty]}>{c.difficulty}</Badge>
                              <span className="text-[11px] text-[var(--muted)]">{c.tests.length} tests · {tries === 0 ? "not run" : `${tries} run${tries > 1 ? "s" : ""}`}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                                <div className={cn("h-full rounded-full", solved ? "bg-[var(--green)]" : "bg-[var(--orange)]")} style={{ width: `${(best / c.tests.length) * 100}%`, transition: "width .5s" }} />
                              </div>
                              <span className="text-[11px] font-semibold tabular-nums text-[var(--text2)]">{best}/{c.tests.length}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Live run */}
          <div className={cn(pane === "live" ? "block" : "hidden", "@container min-w-0 space-y-4 xl:block")}>
            <div className={cn(card, "p-3 sm:p-4")}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[var(--blue-d)] text-[var(--blue)]">{challenge.section}</Badge>
                <Badge className={DIFF_STYLE[challenge.difficulty]}>{challenge.difficulty}</Badge>
                <Badge className="bg-[var(--bg2)] text-[var(--text2)]">{challenge.tests.length} test cases</Badge>
              </div>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">{challenge.title}</h2>
              <p className="mt-1 text-sm text-[var(--text2)]">{challenge.summary}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--border)] pt-3">
                {run === "idle" ? (
                  <button onClick={() => (runMode === "manual" ? startManual() : start())} disabled={!ready} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--orange)] px-5 text-sm font-bold text-white shadow hover:bg-[var(--orange2)] disabled:opacity-60">
                    <Icon name={runMode === "manual" ? "target" : "play"} className="h-4 w-4" /> {runMode === "manual" ? "Start manual test" : "Run all tests"}
                  </button>
                ) : run === "manual" ? (
                  <button onClick={stop} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--red)] px-4 text-sm font-bold text-white hover:opacity-90">
                    <Icon name="stop" className="h-4 w-4" /> Stop
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={togglePause} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border2)] bg-[var(--surface)] px-4 text-sm font-bold hover:bg-[var(--bg2)]">
                      <Icon name={run === "paused" ? "play" : "pause"} className="h-4 w-4" /> {run === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button onClick={stop} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--red)] px-4 text-sm font-bold text-white hover:opacity-90">
                      <Icon name="stop" className="h-4 w-4" /> Stop
                    </button>
                    {awaitingStep && (
                      <button onClick={() => stepResolver.current?.()} className="inline-flex h-10 animate-pulse items-center gap-2 rounded-xl bg-[var(--blue)] px-4 text-sm font-bold text-white">
                        <Icon name="step" className="h-4 w-4" /> Next step
                      </button>
                    )}
                  </div>
                )}

                {/* mobile: options + locators hide behind an arrow */}
                <button
                  type="button"
                  onClick={() => setOptionsOpen((o) => !o)}
                  aria-expanded={optionsOpen}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border2)] bg-[var(--surface)] px-3 text-sm font-semibold md:hidden"
                >
                  Options
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4 transition-transform", optionsOpen && "rotate-180")} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
                </button>

                <div className={cn(optionsOpen ? "flex" : "hidden", "w-full flex-wrap items-center gap-x-4 gap-y-3 md:contents")}>
                <Segmented label="Run mode" value={runMode} onChange={(v) => { if (!running) setRunMode(v as "auto" | "manual"); }} options={[["auto", "Auto"], ["manual", "Manual"]]} />
                <Segmented label="Page mode" value={mode} onChange={(v) => switchMode(v as Mode)} options={[["healthy", "Healthy"], ["bug", "Inject bug"]]} tone={mode === "bug" ? "bad" : "good"} />
                {runMode === "auto" && <Segmented label="Speed" value={String(store.speed)} onChange={(v) => setSpeed(Number(v))} options={SPEEDS.map(([v, l]) => [String(v), l])} />}

                <button onClick={freshPage} disabled={running} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 text-xs font-semibold hover:bg-[var(--bg2)] disabled:opacity-50">
                  <Icon name="reset" /> Reset page
                </button>
                </div>
              </div>

              {mode === "bug" && (
                <div className="mt-3 flex gap-2.5 rounded-xl border border-[var(--amber)]/50 bg-[var(--amber-d)] p-3 text-sm">
                  <Icon name="bug" className="mt-0.5 h-4 w-4 text-[var(--amber)]" />
                  <div>
                    <b>Bug injected: {challenge.bug.title}.</b>{" "}
                    <span className="text-[var(--text2)]">{challenge.bug.detail} Run the tests and watch where the script gets stuck.</span>
                  </div>
                </div>
              )}

              <div className={cn(optionsOpen ? "mt-4 block" : "hidden", "md:mt-4 md:block")}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Elements on this page — click to copy a locator</div>
                <div className="flex flex-wrap gap-2">
                  {challenge.elements.map((el) => <LocatorChip key={el.locator} name={el.name} locator={el.locator} note={el.note} />)}
                </div>
              </div>
            </div>

            {manualView && (
              <ManualBanner
                view={manualView}
                onShow={() => sessionRef.current?.showMe()}
                onStuck={() => sessionRef.current?.reportStuck()}
                onNext={() => sessionRef.current?.next()}
                onStop={stop}
              />
            )}

            <div>
              {/* live page — full width */}
              <div className={cn(card, "flex min-w-0 flex-col overflow-hidden")}>
                <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-[var(--bg2)] px-2.5 py-1 text-xs text-[var(--text2)]">
                    <Icon name="globe" className="h-3 w-3" />
                    <span className="truncate">futurestack.co.in/practice-hub#{challenge.id}</span>
                  </div>
                  <Badge className={mode === "bug" ? "bg-[var(--red-d)] text-[var(--red)]" : "bg-[var(--green-d)] text-[var(--green)]"}>{mode === "bug" ? "bug" : "healthy"}</Badge>
                </div>
                <div ref={wrapRef} className="relative">
                  <div ref={scrollerRef} className="h-[400px] overflow-y-auto bg-[var(--surface)] p-3 sm:p-4 2xl:h-[460px]">
                    <div ref={rootRef} data-practice-root className="@container">
                      {ready && Section ? <Section key={`${challenge.id}-${mode}-${epoch}`} bug={mode === "bug"} /> : <div className="py-16 text-center text-sm text-[var(--muted)]">Loading practice page…</div>}
                    </div>
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-0 z-30"
                    style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)`, opacity: pointer.visible ? 1 : 0, transition: "transform .35s cubic-bezier(.4,0,.2,1), opacity .2s" }}
                  >
                    <span key={pointer.pulse} className="absolute -left-4 -top-4 h-8 w-8 animate-ping rounded-full bg-[var(--orange)]/50" style={{ animationIterationCount: 1, animationDuration: ".6s" }} />
                    <svg width="22" height="22" viewBox="0 0 24 24" className="relative drop-shadow-md">
                      <path d="M4 3l16 8-7 2-2 7z" fill="var(--orange)" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {/* script + output together */}
            <div className="grid items-stretch gap-4 @3xl:grid-cols-2">
              <CodePane gen={gen} lang={lang} onLang={setLang} states={stepStates} />
              <ConsolePane logs={logs} running={running} />
            </div>
          </div>

          {/* Results */}
          <aside className={cn(pane === "results" ? "block" : "hidden", "min-w-0 xl:block")}>
            <div className="space-y-4 xl:sticky xl:top-[72px]">
              <div className={cn(card, "p-3 sm:p-4")}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-base font-bold"><Icon name="target" className="text-[var(--orange)]" /> Test plan & results</h3>
                  {result && !running && <span className="text-xs text-[var(--muted)]">{fmtAgo(result.at)}</span>}
                </div>

                <div className={cn("flex items-center gap-4 rounded-xl p-3", tcFailed > 0 ? "bg-[var(--red-d)]" : tcPassed === challenge.tests.length ? "bg-[var(--green-d)]" : "bg-[var(--bg2)]")}>
                  <Ring value={(tcPassed / challenge.tests.length) * 100} label={`${tcPassed}/${challenge.tests.length}`} size={72} />
                  <div className="min-w-0">
                    <div className="text-sm font-bold">
                      {running ? "Running…" : tcFailed > 0 ? `${tcFailed} test case${tcFailed > 1 ? "s" : ""} failing` : tcPassed === challenge.tests.length ? "All test cases passed 🎉" : "Ready to run"}
                    </div>
                    <div className="text-xs text-[var(--text2)]">
                      {tcPassed} passed · {tcFailed} failed · {challenge.tests.length - tcPassed - tcFailed} pending
                      {result && !running ? ` · ${(result.durationMs / 1000).toFixed(1)}s` : ""}
                    </div>
                  </div>
                </div>

                {stuck && (
                  <div className="mt-3 rounded-xl border border-[var(--red)]/40 bg-[var(--red-d)] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--red)]"><Icon name="bug" className="h-3.5 w-3.5" /> You got stuck here</div>
                    <div className="mt-1 text-sm font-semibold">{stuck.tc.title} → {stuck.step.label}</div>
                    <div className="mt-0.5 text-xs text-[var(--text)]">{stuck.st?.message}</div>
                    {stuck.st?.hint && <div className="mt-1.5 text-xs text-[var(--text2)]">💡 {stuck.st.hint}</div>}
                    <div className="mt-1.5 text-[11px] text-[var(--muted)]">Code line {gen.stepLine[stuck.step.id]} · {LANGS.find((l) => l.id === lang)?.label}</div>
                  </div>
                )}

                <ul className="mt-3 space-y-1.5">
                  {challenge.tests.map((tc, i) => {
                    const st = tcStatus(tc.id);
                    return (
                      <li key={tc.id}>
                        <details key={`${tc.id}-${st === "failed" || st === "running" ? "o" : "c"}`} open={st === "failed" || st === "running"} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                          <summary className="flex cursor-pointer list-none items-center gap-2.5 p-3">
                            <TcBadge status={st} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">TC{i + 1} · {tc.title}</span>
                              <span className="block truncate text-xs text-[var(--muted)]">{tc.description}</span>
                            </span>
                            <button
                              type="button"
                              title={runMode === "manual" ? "Try only this test case yourself" : "Run only this test case"}
                              disabled={running || !ready}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (runMode === "manual") startManual(tc.id); else start(tc.id); }}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border2)] hover:bg-[var(--orange-d)] hover:text-[var(--orange)] disabled:opacity-40"
                            >
                              <Icon name="play" className="h-3 w-3" />
                            </button>
                          </summary>
                          <ol className="space-y-2 border-t border-[var(--border)] px-3 py-2.5">
                            {tc.steps.map((s) => {
                              const ss = stepStates[s.id];
                              return (
                                <li key={s.id} className="flex gap-2.5">
                                  <StepIcon status={ss?.status ?? "idle"} />
                                  <div className="min-w-0 text-xs">
                                    <div className={cn("font-semibold", ss?.status === "skipped" && "text-[var(--muted)]", ss?.status === "running" && "text-[var(--orange)]")}>
                                      {s.label}
                                      {ss?.waited && ss.waited > 400 ? <span className="ml-1.5 font-normal text-[var(--amber)]">⏱ {(ss.waited / 1000).toFixed(1)}s</span> : null}
                                    </div>
                                    {ss?.status === "fail" && <div className="mt-0.5 text-[var(--red)]">{ss.message}</div>}
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </details>
                      </li>
                    );
                  })}
                </ul>

                {!running && result && result.issues.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Issues found</div>
                    <ul className="space-y-1.5">
                      {result.issues.map((is, i) => <IssueRow key={i} issue={is} />)}
                    </ul>
                  </div>
                )}

                {challenge.tips.length > 0 && (
                  <div className="mt-4 rounded-xl bg-[var(--blue-d)] p-3">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--blue)]">Locator tips</div>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--text2)]">
                      {challenge.tips.map((t) => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <HistoryCard attempts={progress.attemptsBy[challenge.id] ?? []} onClear={() => clearChallenge(challenge.id)} />
              {stats.runs > 0 && (
                <button
                  onClick={() => { if (window.confirm("Clear all progress in this browser?")) resetAll(); }}
                  className="w-full text-center text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--red)] hover:underline"
                >
                  Reset all progress
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function ManualBanner({
  view,
  onShow,
  onStuck,
  onNext,
  onStop,
}: {
  view: ManualView;
  onShow: () => void;
  onStuck: () => void;
  onNext: () => void;
  onStop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const st = view.step;
  const value = st && (st.action === "type" || st.action === "select" || st.action === "upload" || st.action === "promptDialog") ? st.value : undefined;
  const failed = view.phase === "failed";
  const between = view.phase === "between";

  return (
    <div className={cn(card, "border-2 p-3 sm:p-4", failed ? "border-[var(--red)]" : between ? "border-[var(--green)]" : "border-[var(--orange)]")}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <Badge className="bg-[var(--orange-d)] text-[var(--orange)]">Manual test</Badge>
        <span className="text-[var(--text2)]">
          Test case {view.tcIndex}/{view.tcTotal} · {view.tcTitle}
        </span>
        {view.phase === "step" && (
          <span className="ml-auto rounded-full bg-[var(--bg2)] px-2 py-0.5 text-[var(--text2)]">
            Step {view.stepIndex}/{view.stepTotal}
          </span>
        )}
      </div>

      {view.phase === "step" && st && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-base font-bold sm:text-lg">👉 Your turn: {st.label}</span>
            {value !== undefined && (
              <button
                onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); })}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border2)] bg-[var(--surface)] px-2 py-0.5 text-xs font-semibold hover:bg-[var(--bg2)]"
              >
                <Icon name={copied ? "check" : "copy"} className="h-3 w-3" /> {copied ? "Copied" : "Copy value"}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {st.action.startsWith("assert") || st.action.startsWith("wait")
              ? "Nothing to do — the hub is checking this on the page."
              : "Do it on the live page below. The highlighted element is your target; the step ticks off by itself."}
          </p>
          {view.warning && <div className="mt-2 rounded-lg bg-[var(--amber-d)] px-3 py-2 text-xs font-semibold text-[var(--amber)]">⚠ {view.warning}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={onShow} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--btn-bg)] px-3 text-xs font-bold text-[var(--btn-text)] hover:opacity-90">
              <Icon name="play" className="h-3 w-3" /> Show me
            </button>
            <button onClick={onStuck} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--red)] px-3 text-xs font-bold text-[var(--red)] hover:bg-[var(--red-d)]">
              <Icon name="bug" className="h-3.5 w-3.5" /> I’m stuck
            </button>
            <button onClick={onStop} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border2)] px-3 text-xs font-bold hover:bg-[var(--bg2)]">
              <Icon name="stop" className="h-3 w-3" /> Stop
            </button>
          </div>
        </>
      )}

      {failed && (
        <div className="mt-2">
          <div className="text-sm font-bold text-[var(--red)]">✗ You got stuck on this test case</div>
          <div className="mt-1 text-xs text-[var(--text)]">{view.message}</div>
          {view.hint && <div className="mt-1 text-xs text-[var(--text2)]">💡 {view.hint}</div>}
          <div className="mt-3 flex gap-2">
            <button onClick={onNext} className="inline-flex h-8 items-center rounded-lg bg-[var(--btn-bg)] px-3 text-xs font-bold text-[var(--btn-text)] hover:opacity-90">
              {view.lastTest ? "Finish & see results" : "Continue to next test case"}
            </button>
            <button onClick={onStop} className="inline-flex h-8 items-center rounded-lg border border-[var(--border2)] px-3 text-xs font-bold hover:bg-[var(--bg2)]">Stop</button>
          </div>
        </div>
      )}

      {between && <div className="mt-2 text-sm font-bold text-[var(--green)]">✓ Test case passed — next one starting…</div>}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
      <div className="text-lg font-extrabold leading-tight tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/55">{label}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold", active ? "border-[var(--orange)] bg-[var(--orange-d)] text-[var(--orange)]" : "border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg2)]")}>
      {children}
    </button>
  );
}

function Segmented({ label, value, onChange, options, tone }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
      <div className="inline-flex rounded-lg border border-[var(--border2)] bg-[var(--bg2)] p-0.5">
        {options.map(([v, l]) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? tone === "bad" && v === "bug"
                    ? "bg-[var(--red)] text-white"
                    : "bg-[var(--btn-bg)] text-[var(--btn-text)]"
                  : "text-[var(--text2)] hover:text-[var(--text)]",
              )}
            >
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocatorChip({ name, locator, note }: { name: string; locator: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(locator).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); })}
      className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-left hover:border-[var(--orange)]"
      title={note}
    >
      <span className="text-xs font-semibold">{name}</span>
      <code className="rounded bg-[var(--bg2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--blue)]">{locator}</code>
      <span className="text-[var(--muted)] group-hover:text-[var(--orange)]">{copied ? <Icon name="check" className="h-3.5 w-3.5 text-[var(--green)]" /> : <Icon name="copy" className="h-3.5 w-3.5" />}</span>
    </button>
  );
}

function TcBadge({ status }: { status: "idle" | "running" | "passed" | "failed" | "partial" }) {
  if (status === "running") return <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-[var(--orange-d)] border-t-[var(--orange)]" />;
  const cls = status === "passed" ? "bg-[var(--green)] text-white" : status === "failed" ? "bg-[var(--red)] text-white" : "border-2 border-[var(--border2)] text-[var(--muted)]";
  return (
    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", cls)}>
      {status === "passed" && <Icon name="check" className="h-3.5 w-3.5" />}
      {status === "failed" && <Icon name="x" className="h-3.5 w-3.5" />}
    </span>
  );
}

const SEV: Record<Issue["severity"], { cls: string; label: string }> = {
  error: { cls: "border-[var(--red)] bg-[var(--red-d)] text-[var(--red)]", label: "Error" },
  warning: { cls: "border-[var(--amber)] bg-[var(--amber-d)] text-[var(--amber)]", label: "Warning" },
  info: { cls: "border-[var(--blue)] bg-[var(--blue-d)] text-[var(--blue)]", label: "Tip" },
};

function IssueRow({ issue }: { issue: Issue }) {
  return (
    <li className={cn("rounded-lg border-l-4 px-3 py-2 text-xs", SEV[issue.severity].cls)}>
      <b>{SEV[issue.severity].label}</b> — <span className="text-[var(--text)]">{issue.message}</span>
    </li>
  );
}

function HistoryCard({ attempts, onClear }: { attempts: Attempt[]; onClear: () => void }) {
  const recent = [...attempts].reverse().slice(0, 6);
  return (
    <div className={cn(card, "p-3 sm:p-4")}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold"><Icon name="clock" className="text-[var(--blue)]" /> Run history</h3>
        {attempts.length > 0 && <button onClick={onClear} className="text-xs text-[var(--muted)] hover:text-[var(--red)]">Clear</button>}
      </div>
      {recent.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Your runs on this challenge show up here.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((a) => {
            const ok = a.passed === a.total;
            return (
              <li key={a.at} className="flex items-center gap-3 text-xs">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", ok ? "bg-[var(--green)]" : "bg-[var(--red)]")} />
                <span className="w-24 shrink-0 font-semibold tabular-nums">{a.passed}/{a.total} passed{a.partial ? "*" : ""}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{a.stuck ?? "No blockers"}</span>
                <span className="shrink-0 text-[var(--muted)]">{a.how === "manual" ? "manual · " : ""}{a.mode === "bug" ? "bug · " : ""}{fmtAgo(a.at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── code view ── */

const KEYWORDS = /\b(import|from|def|assert|await|async|const|class|public|static|new|if|not|using|var|describe|it|test|return|Library|Variables|Settings)\b/;

function Highlight({ text, lang }: { text: string; lang: Lang }) {
  const comment = lang === "python" ? /#.*$/ : lang === "robot" ? /^\s*#.*$|^\*\*\*.*$/ : /\/\/.*$/;
  const re = new RegExp(`(${comment.source})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|${KEYWORDS.source}`, "g");
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const cls = m[1] ? "italic text-[var(--muted)]" : m[2] ? "text-[var(--green)]" : "text-[var(--purple)]";
    out.push(<span key={m.index} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function CodePane({ gen, lang, onLang, states }: { gen: Generated; lang: Lang; onLang: (l: Lang) => void; states: Record<string, StepState> }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const runningId = useMemo(() => Object.entries(states).find(([, s]) => s.status === "running")?.[0], [states]);
  useEffect(() => {
    const sc = scroller.current;
    const line = runningId ? gen.stepLine[runningId] : undefined;
    if (!sc || !line) return;
    const el = sc.querySelector(`[data-line="${line}"]`) as HTMLElement | null;
    if (el) sc.scrollTop = el.offsetTop - sc.clientHeight / 2 + el.offsetHeight / 2;
  }, [runningId, gen]);

  return (
    <div className={cn(card, "flex min-w-0 flex-col overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {LANGS.map((l) => (
            <button key={l.id} onClick={() => onLang(l.id)} title={l.hint} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold", lang === l.id ? "bg-[var(--btn-bg)] text-[var(--btn-text)]" : "text-[var(--text2)] hover:bg-[var(--bg2)]")}>
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigator.clipboard?.writeText(gen.lines.join("\n")).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--bg2)]"
        >
          <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div ref={scroller} className="relative h-[400px] overflow-auto bg-[var(--surface)] py-1.5 font-mono text-[12.5px] leading-[21px] 2xl:h-[460px]" style={{ fontFamily: "var(--font-mono), ui-monospace, monospace" }}>
        <div className="min-w-max">
          {gen.lines.map((line, i) => {
            const owner = gen.lineOwner[i];
            const st = owner ? states[owner] : undefined;
            const endOfStep = owner && gen.lineOwner[i + 1] !== owner;
            return (
              <div key={i}>
                <div
                  data-line={i + 1}
                  className={cn(
                    "flex border-l-[3px] border-transparent pr-4",
                    st?.status === "running" && "border-[var(--orange)] bg-[var(--orange-d)]",
                    st?.status === "pass" && "border-[var(--green)] bg-[var(--green-d)]",
                    st?.status === "fail" && "border-[var(--red)] bg-[var(--red-d)]",
                  )}
                >
                  <span className="w-10 shrink-0 select-none pr-3 text-right text-[var(--muted)]">{i + 1}</span>
                  <span className="whitespace-pre text-[var(--text)]"><Highlight text={line} lang={lang} /></span>
                </div>
                {endOfStep && st?.status === "fail" && (
                  <div className="ml-10 whitespace-normal border-l-[3px] border-[var(--red)] bg-[var(--red-d)] py-1 pl-3 pr-4 font-sans text-xs font-semibold text-[var(--red)]">
                    ✗ {st.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConsolePane({ logs, running }: { logs: LogLine[]; running: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [logs]);
  const color = { info: "text-[#9ca3af]", pass: "text-[#4ade80]", fail: "text-[#f87171]", warn: "text-[#fbbf24]" } as const;
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0b1020] shadow-[var(--shadow)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
        <span className="ml-2 text-xs font-semibold text-white/60">Console output</span>
        {running && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[#4ade80]" />}
      </div>
      <div className="relative min-h-[220px] flex-1"><div ref={box} className="absolute inset-0 space-y-0.5 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? <div className="text-[#6b7280]">Run the tests automatically, or choose Manual and do the steps yourself on the live page.</div> : logs.map((l, i) => <div key={i} className={cn("whitespace-pre-wrap", color[l.level])}>{l.text}</div>)}
      </div>
      </div>
    </div>
  );
}
