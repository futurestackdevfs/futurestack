import type { Challenge, Step, TestCase } from "./data";
import {
  HINTS,
  assertCheck,
  diagnose,
  queryAll,
  runSingleStep,
  text,
  type Issue,
  type Mode,
  type RunResult,
  type RunnerHost,
  type Stuck,
  type StepResult,
  type TestResult,
} from "./engine";

export interface ManualView {
  phase: "step" | "failed" | "between";
  tcIndex: number;
  tcTotal: number;
  tcTitle: string;
  stepIndex: number;
  stepTotal: number;
  step: Step | null;
  warning?: string;
  message?: string;
  hint?: string;
  lastTest: boolean;
}

export interface ManualHost {
  runner: RunnerHost;
  onView(view: ManualView | null): void;
  onFinish(result: RunResult): void;
}

const EVENTS = ["click", "dblclick", "contextmenu", "mouseover", "drop"] as const;
const DIALOG_ACCEPT = '[data-testid="dialog-accept"]';
const DIALOG_CANCEL = '[data-testid="dialog-cancel"]';
const DIALOG_INPUT = '[data-testid="dialog-input"]';
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * The learner performs each step on the live page; this watches the real DOM
 * (events + state) and ticks the step off when it is done — or fails it when
 * the app doesn't cooperate. Mirrors what the auto-runner reports.
 */
export class ManualSession {
  private qi = 0;
  private si = 0;
  private cur: StepResult[] = [];
  private results: TestResult[] = [];
  private issues: Issue[] = [];
  private stuck: Stuck | null = null;
  private since = 0;
  private busy = false;
  private pending = false;
  private stopped = false;
  private finished = false;
  private timer: number | undefined;
  private warning: string | undefined;
  private lastEl: Element | null = null;
  private attached = new Set<EventTarget>();
  private startedAt = performance.now();
  private failure: { message: string; hint?: string } | null = null;

  constructor(
    private ch: Challenge,
    private mode: Mode,
    private tcIds: string[],
    private host: ManualHost,
  ) {}

  /* ── lifecycle ── */

  async start() {
    this.timer = window.setInterval(() => this.tick(), 200);
    await this.beginTest(0);
  }

  stop() {
    if (this.stopped || this.finished) return;
    this.stopped = true;
    this.cleanup();
    this.host.onView(null);
  }

  private cleanup() {
    window.clearInterval(this.timer);
    this.attached.forEach((t) => EVENTS.forEach((e) => t.removeEventListener(e, this.onEvent, true)));
    this.attached.clear();
  }

  /* ── helpers ── */

  private tc(): TestCase {
    return this.ch.tests.find((t) => t.id === this.tcIds[this.qi])!;
  }
  private step(): Step | undefined {
    return this.tc()?.steps[this.si];
  }
  private root() {
    return this.host.runner.root();
  }
  private first(st: Step): Element | undefined {
    const root = this.root();
    if (!root || !st.loc) return undefined;
    try {
      return queryAll(root, st.loc, st.via)[0];
    } catch {
      return undefined;
    }
  }

  private emit(phase: ManualView["phase"], extra: Partial<ManualView> = {}) {
    if (this.stopped) return;
    const tc = this.tc();
    this.host.onView({
      phase,
      tcIndex: this.qi + 1,
      tcTotal: this.tcIds.length,
      tcTitle: tc?.title ?? "",
      stepIndex: this.si + 1,
      stepTotal: tc?.steps.length ?? 0,
      step: phase === "step" ? (this.step() ?? null) : null,
      warning: phase === "step" ? this.warning : undefined,
      lastTest: this.qi >= this.tcIds.length - 1,
      ...extra,
    });
  }

  /* ── flow ── */

  private async beginTest(qi: number) {
    this.qi = qi;
    this.si = 0;
    this.cur = [];
    this.failure = null;
    this.host.runner.log({ level: "info", text: `▶ ${this.ch.tests.indexOf(this.tc()) + 1}. ${this.tc().title}` });
    await this.enterStep();
  }

  private async enterStep() {
    if (this.stopped) return;
    const st = this.step();
    if (!st) return;
    this.since = performance.now();
    this.pending = false;
    this.warning = undefined;
    this.lastEl = null;
    this.host.runner.onStep(st.id, { status: "running" });
    this.emit("step");
    if (st.action === "open") {
      this.busy = true;
      await this.host.runner.reset();
      await sleep(250);
      this.busy = false;
      if (!this.stopped) this.pass(st);
    }
  }

  private pass(st: Step) {
    if (this.stopped) return;
    this.pending = true;
    const waited = st.action.startsWith("wait") ? Math.round(performance.now() - this.since) : 0;
    this.cur.push({ id: st.id, label: st.label, status: "pass", waited });
    this.host.runner.onStep(st.id, { status: "pass", waited });
    this.host.runner.log({ level: "pass", text: `  ✓ ${st.label}` });
    window.setTimeout(() => {
      if (this.stopped) return;
      this.si += 1;
      if (this.si < this.tc().steps.length) void this.enterStep();
      else this.finishTest(true);
    }, 350);
  }

  private fail(st: Step, message: string, hint?: string) {
    if (this.stopped) return;
    this.pending = true;
    const h = st.hint ?? hint;
    this.cur.push({ id: st.id, label: st.label, status: "fail", message, hint: h });
    this.host.runner.onStep(st.id, { status: "fail", message, hint: h });
    this.host.runner.log({ level: "fail", text: `  ✗ ${st.label}` });
    this.host.runner.log({ level: "fail", text: `    ${message}` });
    this.issues.push({ severity: "error", stepId: st.id, message });
    const tc = this.tc();
    if (!this.stuck) this.stuck = { testId: tc.id, testTitle: tc.title, stepId: st.id, stepLabel: st.label, reason: message, hint: h };
    for (const rest of tc.steps.slice(this.si + 1)) {
      this.cur.push({ id: rest.id, label: rest.label, status: "skipped" });
      this.host.runner.onStep(rest.id, { status: "skipped" });
    }
    this.failure = { message, hint: h };
    this.finishTest(false);
  }

  private finishTest(ok: boolean) {
    const tc = this.tc();
    this.results.push({ id: tc.id, title: tc.title, description: tc.description, status: ok ? "passed" : "failed", steps: this.cur });
    this.host.runner.log({ level: ok ? "pass" : "fail", text: ok ? `✓ ${tc.title} — passed` : `✗ ${tc.title} — FAILED` });
    const last = this.qi >= this.tcIds.length - 1;
    if (!ok) {
      this.emit("failed", { message: this.failure?.message, hint: this.failure?.hint });
      return;
    }
    if (last) {
      this.complete();
      return;
    }
    this.emit("between");
    window.setTimeout(() => {
      if (!this.stopped) void this.beginTest(this.qi + 1);
    }, 1100);
  }

  /** Continue after a failed test case. */
  next() {
    if (this.stopped || this.finished || this.step() === undefined) return;
    if (this.qi >= this.tcIds.length - 1) this.complete();
    else void this.beginTest(this.qi + 1);
  }

  private complete() {
    if (this.finished || this.stopped) return;
    this.finished = true;
    this.cleanup();
    const steps = this.results.flatMap((r) => r.steps);
    const passed = this.results.filter((r) => r.status === "passed").length;
    this.host.runner.log({ level: passed === this.results.length ? "pass" : "warn", text: `━ ${passed}/${this.results.length} test cases passed` });
    this.host.onView(null);
    this.host.onFinish({
      challengeId: this.ch.id,
      mode: this.mode,
      at: Date.now(),
      durationMs: Math.round(performance.now() - this.startedAt),
      partial: this.tcIds.length !== this.ch.tests.length,
      how: "manual",
      tests: this.results,
      passed,
      total: this.results.length,
      stepsPassed: steps.filter((s) => s.status === "pass").length,
      stepsTotal: steps.length,
      issues: this.issues,
      stuck: this.stuck,
    });
  }

  /* ── learner controls ── */

  /** Watch the runner do the current step. */
  async showMe() {
    const st = this.step();
    if (!st || this.busy || this.pending || this.stopped) return;
    this.busy = true;
    try {
      await runSingleStep(this.host.runner, st);
      this.busy = false;
      this.pass(st);
    } catch (e) {
      this.busy = false;
      if (this.stopped || this.host.runner.aborted()) return;
      const err = e as Error & { hint?: string };
      this.fail(st, err.message, err.hint);
    }
  }

  /** Report being stuck — diagnose why and fail the step. */
  reportStuck() {
    const st = this.step();
    const root = this.root();
    if (!st || !root || this.busy || this.pending || this.stopped) return;
    const d = diagnose(root, st);
    this.fail(st, d?.message ?? "You reported being stuck on this step.", d?.hint ?? "Use “Show me” to watch the expected action, then compare with what you did.");
  }

  /* ── observing the page ── */

  private attach(root: HTMLElement) {
    const targets: EventTarget[] = [root];
    root.querySelectorAll("iframe").forEach((f) => {
      const d = (f as HTMLIFrameElement).contentDocument;
      if (d) targets.push(d);
    });
    for (const t of targets) {
      if (this.attached.has(t)) continue;
      this.attached.add(t);
      EVENTS.forEach((e) => t.addEventListener(e, this.onEvent, true));
    }
  }

  private onEvent = (e: Event) => {
    const st = this.step();
    if (!st || this.busy || this.pending || this.stopped) return;
    const real = ((e.composedPath?.()[0] ?? e.target) as Element | null) ?? null;
    if (!real || typeof real.closest !== "function") return;
    const hit = (sel?: string) => {
      if (!sel) return false;
      try {
        return !!real.closest(sel);
      } catch {
        return false;
      }
    };
    let done = false;
    switch (st.action) {
      case "click":
        done = e.type === "click" && hit(st.loc);
        break;
      case "dblclick":
        done = e.type === "dblclick" && hit(st.loc);
        break;
      case "rightclick":
        done = e.type === "contextmenu" && hit(st.loc);
        break;
      case "hover":
        done = e.type === "mouseover" && hit(st.loc);
        break;
      case "drag":
        done = e.type === "drop" && hit(st.value);
        break;
      case "acceptDialog":
        done = e.type === "click" && hit(DIALOG_ACCEPT);
        break;
      case "dismissDialog":
        done = e.type === "click" && hit(DIALOG_CANCEL);
        break;
      case "promptDialog": {
        const input = this.root()?.querySelector(DIALOG_INPUT) as HTMLInputElement | null;
        done = e.type === "click" && hit(DIALOG_ACCEPT) && input?.value === st.value;
        break;
      }
    }
    if (done) {
      this.pending = true;
      window.setTimeout(() => {
        this.pending = false;
        this.pass(st);
      }, 200);
    }
  };

  private tick() {
    if (this.stopped || this.finished || this.busy || this.pending) return;
    const root = this.root();
    const st = this.step();
    if (!root || !st) return;
    this.attach(root);
    const elapsed = performance.now() - this.since;
    const el = this.first(st);
    const input = el as HTMLInputElement | HTMLSelectElement | undefined;

    // keep the target highlighted (React may have replaced the node)
    const target = st.action.endsWith("Dialog") ? root.querySelector(st.action === "dismissDialog" ? DIALOG_CANCEL : DIALOG_ACCEPT) : el;
    if (target && target !== this.lastEl) {
      this.lastEl = target;
      this.host.runner.pointer(target);
    }

    switch (st.action) {
      case "type":
        if (input && (input as HTMLInputElement).value === st.value) return this.pass(st);
        break;
      case "select":
        if (input instanceof HTMLSelectElement && input.selectedOptions[0]?.text.trim() === st.value) return this.pass(st);
        break;
      case "check":
        if (input && (input as HTMLInputElement).checked) return this.pass(st);
        break;
      case "uncheck":
        if (input && !(input as HTMLInputElement).checked) return this.pass(st);
        break;
      case "upload":
        if ((input as HTMLInputElement | undefined)?.files?.[0]?.name === st.value) return this.pass(st);
        break;
      case "waitVisible":
      case "waitText": {
        const ok = el && el.getClientRects().length > 0 && (st.action === "waitVisible" || text(el).includes(st.value ?? ""));
        if (ok) return this.pass(st);
        const limit = st.timeout ?? 5000;
        if (elapsed > limit) {
          const msg =
            st.action === "waitText"
              ? `Timeout ${limit}ms exceeded waiting for ${st.loc} to contain "${st.value}"${el ? ` (last text: "${text(el).slice(0, 40)}")` : " (element not found)"}`
              : `Timeout ${limit}ms exceeded waiting for ${st.loc} to be visible`;
          return this.fail(st, msg, HINTS.timeout);
        }
        break;
      }
      default:
        if (st.action.startsWith("assert")) {
          const msg = assertCheck(root, st);
          if (msg === null) return this.pass(st);
          if (elapsed > 1500) return this.fail(st, msg, HINTS.assertion);
        }
    }

    // gentle nudge when the control looks unusable for a while
    if (elapsed > 3500 && !st.action.startsWith("assert") && !st.action.startsWith("wait")) {
      const d = diagnose(root, st);
      const w = d ? `${d.message} — if you can't do this step, press “I'm stuck”.` : undefined;
      if (w !== this.warning) {
        this.warning = w;
        this.emit("step");
      }
    }
  }
}
