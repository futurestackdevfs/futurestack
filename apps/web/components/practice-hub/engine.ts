import type { Challenge, Step } from "./data";

export type Mode = "healthy" | "bug";
export type StepStatus = "idle" | "running" | "pass" | "fail" | "skipped";

export interface StepState {
  status: StepStatus;
  /** time spent waiting for the app (ms) — not the animation pacing */
  waited?: number;
  message?: string;
  hint?: string;
}

export interface StepResult extends StepState {
  id: string;
  label: string;
}

export interface TestResult {
  id: string;
  title: string;
  description: string;
  status: "passed" | "failed";
  steps: StepResult[];
}

export interface Issue {
  severity: "error" | "warning" | "info";
  message: string;
  stepId?: string;
}

export interface Stuck {
  testId: string;
  testTitle: string;
  stepId: string;
  stepLabel: string;
  reason: string;
  hint?: string;
}

export interface RunResult {
  challengeId: string;
  mode: Mode;
  at: number;
  durationMs: number;
  partial: boolean;
  /** who drove the run */
  how?: "auto" | "manual";
  tests: TestResult[];
  passed: number;
  total: number;
  stepsPassed: number;
  stepsTotal: number;
  issues: Issue[];
  stuck: Stuck | null;
}

export interface LogLine {
  level: "info" | "pass" | "fail" | "warn";
  text: string;
}

/** Everything the runner needs from the page that hosts it. */
export interface RunnerHost {
  root(): HTMLElement | null;
  /** Remount the live section and resolve once it is in the DOM. */
  reset(): Promise<void>;
  speed(): number;
  aborted(): boolean;
  /** Resolves when the next step may start (handles pause and manual step mode). */
  gate(): Promise<void>;
  pointer(el: Element | null, pulse?: boolean): void;
  onStep(stepId: string, st: StepState): void;
  log(line: LogLine): void;
}

export class AbortRun extends Error {}

export class StepError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.hint = hint;
  }
}

const FIND_TIMEOUT = 3000;
const ASSERT_RETRY = 1500;
export const HINTS = {
  missing: "Check the locator against the page (id, data-testid). If the element appears late, add an explicit wait.",
  disabled: "The control is disabled — a precondition was not met. If the app is wrong, report it as a defect with the steps you took.",
  notVisible: "The element exists but is hidden or collapsed. Make sure the step that reveals it ran first.",
  readonly: "The field cannot be edited. Verify the page state before typing.",
  assertion: "The application behaves differently from the expectation. Log a defect: steps, expected vs actual.",
  timeout: "Never use a fixed sleep. Use an explicit wait with a sensible timeout, and report unusually slow loads.",
  dialog: "No popup was open. Trigger it first, and check whether the app failed to show it.",
};

const sleepReal = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Read the real DOM property without React's value tracker getting in the way. */
function setNative(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
}

const fire = (el: Element, type: string, init: EventInit = {}) =>
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true, ...init }));

const mouse = (el: Element, type: string, init: MouseEventInit = {}) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: el.ownerDocument.defaultView, ...init }));

export function isVisible(el: Element): boolean {
  const e = el as HTMLElement;
  if (!e.getClientRects || e.getClientRects().length === 0) return false;
  const win = el.ownerDocument.defaultView;
  const cs = win?.getComputedStyle(e);
  return !cs || (cs.visibility !== "hidden" && cs.display !== "none");
}

export const isDisabled = (el: Element) =>
  (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true";

function scopeFor(root: HTMLElement, via?: Step["via"]): ParentNode | null {
  if (!via) return root;
  const host = root.querySelector(via.host) as HTMLElement | null;
  if (!host) return null;
  return via.kind === "shadow" ? host.shadowRoot : (host as HTMLIFrameElement).contentDocument;
}

export function queryAll(root: HTMLElement, sel: string, via?: Step["via"]): Element[] {
  const scope = scopeFor(root, via);
  if (!scope) return [];
  try {
    return Array.from(scope.querySelectorAll(sel));
  } catch {
    throw new StepError(`Invalid locator ${sel}`, "Check the selector syntax.");
  }
}

interface Ctx {
  host: RunnerHost;
  waited: number;
}

function pace(ctx: Ctx, base: number) {
  const sp = Math.max(0.25, ctx.host.speed());
  return sleepReal(base / sp);
}

async function waitFor<T>(ctx: Ctx, fn: () => T | null | undefined | false, timeout: number): Promise<T | null> {
  const start = performance.now();
  for (;;) {
    if (ctx.host.aborted()) throw new AbortRun();
    const v = fn();
    if (v) {
      ctx.waited += performance.now() - start;
      return v;
    }
    if (performance.now() - start >= timeout) {
      ctx.waited += performance.now() - start;
      return null;
    }
    await sleepReal(40);
  }
}

const rootOf = (ctx: Ctx) => {
  const r = ctx.host.root();
  if (!r) throw new StepError("The practice page is not mounted.");
  return r;
};

async function locate(ctx: Ctx, st: Step, sel = st.loc!, via = st.via): Promise<Element> {
  const el = await waitFor(ctx, () => queryAll(rootOf(ctx), sel, via)[0], FIND_TIMEOUT);
  if (!el) throw new StepError(`Element ${sel} not found after ${FIND_TIMEOUT}ms (NoSuchElement)`, HINTS.missing);
  return el;
}

type Need = "visible" | "enabled" | "editable";

function ensure(el: Element, sel: string, need: Need[]) {
  if (need.includes("visible") && !isVisible(el)) {
    throw new StepError(`Element ${sel} is not visible (ElementNotInteractable)`, HINTS.notVisible);
  }
  if (need.includes("enabled") && isDisabled(el)) {
    throw new StepError(`Element ${sel} is disabled (ElementNotInteractable)`, HINTS.disabled);
  }
  if (need.includes("editable") && ((el as HTMLInputElement).readOnly === true || isDisabled(el))) {
    throw new StepError(`Element ${sel} is not editable`, HINTS.readonly);
  }
}

const SET_AT_ONCE = new Set(["date", "time", "range", "color", "month", "week", "datetime-local", "file"]);

async function typeInto(ctx: Ctx, el: Element, value: string) {
  const input = el as HTMLInputElement | HTMLTextAreaElement;
  (input as HTMLElement).focus?.();
  const kind = input instanceof HTMLInputElement ? input.type : "text";
  if (SET_AT_ONCE.has(kind) || ctx.host.speed() >= 4) {
    setNative(input, value);
    fire(input, "input");
    fire(input, "change");
    return;
  }
  setNative(input, "");
  fire(input, "input");
  for (const ch of value) {
    setNative(input, input.value + ch);
    fire(input, "input");
    await pace(ctx, 38);
  }
  fire(input, "change");
}

export function text(el: Element) {
  return ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
}

const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** One-shot evaluation of an assert* step. Returns a failure message, or null when it holds. */
export function assertCheck(root: HTMLElement, st: Step): string | null {
  const sel = st.loc ?? "";
  const val = st.value ?? "";
  const first = () => queryAll(root, sel, st.via)[0];
  if (st.action === "assertCount") {
    const n = queryAll(root, sel, st.via).length;
    return n === Number(val) ? null : `Expected ${sel} to match ${val} element(s) but found ${n}`;
  }
  const el = first();
  if (st.action === "assertHidden") {
    return !el || !isVisible(el) ? null : `Expected ${sel} to be hidden but it is visible`;
  }
  if (!el) return `Element ${sel} not found (NoSuchElement)`;
  switch (st.action) {
    case "assertText": {
      const got = text(el);
      return got.includes(val) ? null : `Expected ${sel} to contain "${val}" but was "${clip(got)}"`;
    }
    case "assertValue": {
      const got = (el as HTMLInputElement).value ?? "";
      return got === val ? null : `Expected ${sel} to have value "${val}" but was "${clip(got)}"`;
    }
    case "assertVisible":
      return isVisible(el) ? null : `Expected ${sel} to be visible`;
    case "assertEnabled":
      return isDisabled(el) ? `Expected ${sel} to be enabled but it is disabled` : null;
    case "assertDisabled":
      return isDisabled(el) ? null : `Expected ${sel} to be disabled but it is enabled`;
    case "assertChecked":
      return (el as HTMLInputElement).checked ? null : `Expected ${sel} to be checked`;
    case "assertAttr": {
      const m = /^([\w-]+)(\^=|=)(.*)$/.exec(val);
      if (!m) return `Bad attribute expectation "${val}"`;
      const got = el.getAttribute(m[1]) ?? "";
      const ok = m[2] === "=" ? got === m[3] : got.startsWith(m[3]);
      return ok ? null : `Expected ${sel} attribute ${m[1]} ${m[2] === "=" ? "to equal" : "to start with"} "${m[3]}" but was "${got}"`;
    }
  }
  return null;
}

async function assertRetry(ctx: Ctx, check: () => string | null, fallbackHint = HINTS.assertion) {
  const start = performance.now();
  let last: string | null = null;
  for (;;) {
    if (ctx.host.aborted()) throw new AbortRun();
    last = check();
    if (last === null) return;
    if (performance.now() - start >= ASSERT_RETRY) break;
    await sleepReal(50);
  }
  throw new StepError(last ?? "Assertion failed", fallbackHint);
}

let lastHover: Element | null = null;

async function perform(ctx: Ctx, st: Step, challengeReset: () => Promise<void>) {
  const { host } = ctx;
  const sel = st.loc ?? "";
  const val = st.value ?? "";

  if (st.action === "open") {
    lastHover = null;
    host.pointer(null);
    await challengeReset();
    await pace(ctx, 300);
    return;
  }

  /* dialogs ------------------------------------------------------------ */
  if (st.action === "acceptDialog" || st.action === "dismissDialog" || st.action === "promptDialog") {
    const dialog = await waitFor(ctx, () => rootOf(ctx).querySelector('[data-testid="dialog"]'), 2000);
    if (!dialog) throw new StepError("No popup is open", HINTS.dialog);
    await pace(ctx, 450);
    if (st.action === "promptDialog") {
      const input = dialog.querySelector('[data-testid="dialog-input"]') as HTMLInputElement | null;
      if (input) {
        host.pointer(input);
        await typeInto(ctx, input, val);
      }
    }
    const btn = dialog.querySelector(
      st.action === "dismissDialog" ? '[data-testid="dialog-cancel"]' : '[data-testid="dialog-accept"]',
    ) as HTMLElement | null;
    if (!btn) throw new StepError("The popup has no matching button.", HINTS.dialog);
    host.pointer(btn, true);
    await pace(ctx, 250);
    btn.click();
    return;
  }

  /* waits -------------------------------------------------------------- */
  if (st.action === "waitVisible" || st.action === "waitText") {
    const timeout = st.timeout ?? 5000;
    const found = await waitFor(
      ctx,
      () => {
        const el = queryAll(rootOf(ctx), sel, st.via)[0];
        if (!el || !isVisible(el)) return null;
        return st.action === "waitText" ? (text(el).includes(val) ? el : null) : el;
      },
      timeout,
    );
    if (!found) {
      const cur = queryAll(rootOf(ctx), sel, st.via)[0];
      const why =
        st.action === "waitText"
          ? `Timeout ${timeout}ms exceeded waiting for ${sel} to contain "${val}"${cur ? ` (last text: "${clip(text(cur), 40)}")` : " (element not found)"}`
          : `Timeout ${timeout}ms exceeded waiting for ${sel} to be visible`;
      throw new StepError(why, st.hint ?? HINTS.timeout);
    }
    host.pointer(found);
    await pace(ctx, 200);
    return;
  }

  /* assertions --------------------------------------------------------- */
  if (st.action.startsWith("assert")) {
    const hint = st.hint ?? HINTS.assertion;
    const first = () => queryAll(rootOf(ctx), sel, st.via)[0];
    const pre = first();
    if (pre) host.pointer(pre);
    await pace(ctx, 250);
    await assertRetry(ctx, () => assertCheck(rootOf(ctx), st), hint);
    return;
  }

  /* element actions ---------------------------------------------------- */
  const el = await locate(ctx, st);
  host.pointer(el);
  await pace(ctx, 260);

  switch (st.action) {
    case "type":
      ensure(el, sel, ["visible", "enabled", "editable"]);
      await typeInto(ctx, el, val);
      break;
    case "click": {
      ensure(el, sel, ["visible", "enabled"]);
      host.pointer(el, true);
      await pace(ctx, 220);
      (el as HTMLElement).click();
      break;
    }
    case "dblclick":
      ensure(el, sel, ["visible", "enabled"]);
      host.pointer(el, true);
      await pace(ctx, 200);
      mouse(el, "click", { detail: 1 });
      mouse(el, "click", { detail: 2 });
      mouse(el, "dblclick", { detail: 2 });
      break;
    case "rightclick":
      ensure(el, sel, ["visible", "enabled"]);
      host.pointer(el, true);
      await pace(ctx, 200);
      mouse(el, "contextmenu", { button: 2 });
      break;
    case "hover":
      ensure(el, sel, ["visible"]);
      if (lastHover && lastHover !== el) mouse(lastHover, "mouseout", { relatedTarget: el });
      mouse(el, "mouseover");
      mouse(el, "mouseenter", { bubbles: false });
      lastHover = el;
      break;
    case "select": {
      ensure(el, sel, ["visible", "enabled"]);
      const select = el as HTMLSelectElement;
      const opt = Array.from(select.options).find((o) => o.text.trim() === val || o.value === val);
      if (!opt) {
        throw new StepError(
          `Option "${val}" not found in ${sel} (available: ${Array.from(select.options).map((o) => o.text.trim()).join(", ")})`,
          "The expected option does not exist in the dropdown. Check the data source, or report it as a defect.",
        );
      }
      setNative(select, opt.value);
      fire(select, "change");
      break;
    }
    case "check":
    case "uncheck": {
      ensure(el, sel, ["visible", "enabled"]);
      const box = el as HTMLInputElement;
      const want = st.action === "check";
      if (box.checked !== want) {
        host.pointer(el, true);
        await pace(ctx, 200);
        box.click();
      }
      break;
    }
    case "upload": {
      ensure(el, sel, ["enabled"]);
      const dt = new DataTransfer();
      dt.items.add(new File(["FutureStack practice upload"], val, { type: "text/plain" }));
      (el as HTMLInputElement).files = dt.files;
      fire(el, "input");
      fire(el, "change");
      break;
    }
    case "drag": {
      ensure(el, sel, ["visible"]);
      const target = await locate(ctx, st, val);
      const dt = new DataTransfer();
      const ev = (type: string, node: Element) =>
        node.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
      ev("dragstart", el);
      await pace(ctx, 300);
      host.pointer(target);
      ev("dragenter", target);
      ev("dragover", target);
      await pace(ctx, 300);
      ev("drop", target);
      ev("dragend", el);
      break;
    }
  }
  await pace(ctx, 180);
}

/** Run every test case (or just one) against the live section. */
export async function runChallenge(
  challenge: Challenge,
  host: RunnerHost,
  mode: Mode,
  onlyTest?: string,
): Promise<RunResult> {
  const started = performance.now();
  const tests: TestResult[] = [];
  const issues: Issue[] = [];
  let stuck: Stuck | null = null;
  const list = challenge.tests.filter((tc) => !onlyTest || tc.id === onlyTest);

  for (const [ti, tc] of list.entries()) {
    host.log({ level: "info", text: `▶ ${challenge.tests.indexOf(tc) + 1}. ${tc.title}` });
    const steps: StepResult[] = [];
    let failed = false;

    for (const st of tc.steps) {
      if (failed) {
        const skipped: StepState = { status: "skipped" };
        host.onStep(st.id, skipped);
        steps.push({ id: st.id, label: st.label, ...skipped });
        continue;
      }
      await host.gate();
      if (host.aborted()) throw new AbortRun();
      host.onStep(st.id, { status: "running" });
      const ctx: Ctx = { host, waited: 0 };
      try {
        await perform(ctx, st, host.reset);
        const done: StepState = { status: "pass", waited: Math.round(ctx.waited) };
        host.onStep(st.id, done);
        steps.push({ id: st.id, label: st.label, ...done });
        host.log({ level: "pass", text: `  ✓ ${st.label}${ctx.waited > 400 ? `  (${(ctx.waited / 1000).toFixed(1)}s)` : ""}` });
        if (ctx.waited > 1000 && st.action !== "waitVisible" && st.action !== "waitText" && st.action !== "open") {
          issues.push({
            severity: "warning",
            stepId: st.id,
            message: `${st.loc} took ${(ctx.waited / 1000).toFixed(1)}s to appear — add an explicit wait instead of relying on luck.`,
          });
        } else if (ctx.waited > 3000) {
          issues.push({ severity: "info", stepId: st.id, message: `Waiting for ${st.loc} took ${(ctx.waited / 1000).toFixed(1)}s — worth a performance note.` });
        }
      } catch (e) {
        if (e instanceof AbortRun) throw e;
        const message = e instanceof StepError ? e.message : e instanceof Error ? e.message : String(e);
        const hint = st.hint ?? (e instanceof StepError ? e.hint : undefined);
        const fail: StepState = { status: "fail", waited: Math.round(ctx.waited), message, hint };
        host.onStep(st.id, fail);
        steps.push({ id: st.id, label: st.label, ...fail });
        host.log({ level: "fail", text: `  ✗ ${st.label}` });
        host.log({ level: "fail", text: `    ${message}` });
        failed = true;
        issues.push({ severity: "error", stepId: st.id, message });
        if (!stuck) stuck = { testId: tc.id, testTitle: tc.title, stepId: st.id, stepLabel: st.label, reason: message, hint };
      }
    }

    tests.push({
      id: tc.id,
      title: tc.title,
      description: tc.description,
      status: failed ? "failed" : "passed",
      steps,
    });
    host.log({
      level: failed ? "fail" : "pass",
      text: failed ? `✗ ${tc.title} — FAILED` : `✓ ${tc.title} — passed`,
    });
    if (ti < list.length - 1) await pace({ host, waited: 0 }, 300);
  }

  const allSteps = tests.flatMap((x) => x.steps);
  const passed = tests.filter((x) => x.status === "passed").length;
  host.log({
    level: passed === tests.length ? "pass" : "warn",
    text: `━ ${passed}/${tests.length} test cases passed`,
  });

  return {
    challengeId: challenge.id,
    mode,
    at: Date.now(),
    durationMs: Math.round(performance.now() - started),
    partial: !!onlyTest,
    tests,
    passed,
    total: tests.length,
    stepsPassed: allSteps.filter((s) => s.status === "pass").length,
    stepsTotal: allSteps.length,
    issues,
    stuck,
  };
}

/** Run one step on its own (used by manual mode's "Show me"). Resolves to the ms spent waiting. */
export async function runSingleStep(host: RunnerHost, st: Step): Promise<number> {
  const ctx: Ctx = { host, waited: 0 };
  await perform(ctx, st, host.reset);
  return Math.round(ctx.waited);
}

const NEEDS_ENABLED = new Set(["type", "click", "dblclick", "rightclick", "select", "check", "uncheck"]);

/** Why an interaction step can't be done right now, or null when the target looks usable. */
export function diagnose(root: HTMLElement, st: Step): { message: string; hint: string } | null {
  if (!st.loc || st.action === "open" || st.action.startsWith("assert") || st.action.endsWith("Dialog")) return null;
  let el: Element | undefined;
  try {
    el = queryAll(root, st.loc, st.via)[0];
  } catch {
    return { message: `Invalid locator ${st.loc}`, hint: "Check the selector syntax." };
  }
  if (!el) return { message: `Element ${st.loc} not found (NoSuchElement)`, hint: HINTS.missing };
  if (st.action.startsWith("wait")) return null;
  if (!isVisible(el)) return { message: `Element ${st.loc} is not visible (ElementNotInteractable)`, hint: HINTS.notVisible };
  if (NEEDS_ENABLED.has(st.action) && isDisabled(el)) {
    return { message: `Element ${st.loc} is disabled (ElementNotInteractable)`, hint: HINTS.disabled };
  }
  if ((st.action === "type" || st.action === "select") && (el as HTMLInputElement).readOnly === true) {
    return { message: `Element ${st.loc} is not editable`, hint: HINTS.readonly };
  }
  return null;
}
