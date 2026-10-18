"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "./data";
import type { Mode, RunResult } from "./engine";

export interface Attempt {
  challengeId: string;
  mode: Mode;
  at: number;
  passed: number;
  total: number;
  partial: boolean;
  how?: "auto" | "manual";
  stuck: string | null;
}

interface Store {
  lang: Lang;
  speed: number; // 0 = step-by-step
  last: Record<string, RunResult>; // `${challengeId}:${mode}`
  attempts: Attempt[];
}

const KEY = "fs-practice-hub-v2";
const EMPTY: Store = { lang: "python", speed: 1, last: {}, attempts: [] };

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    return EMPTY;
  }
}

export const slot = (challengeId: string, mode: Mode) => `${challengeId}:${mode}`;

let cache: Store | null = null;
const listeners = new Set<() => void>();

const snapshot = () => (cache ??= read());
const serverSnapshot = () => EMPTY;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

function commit(fn: (s: Store) => Store) {
  cache = fn(snapshot());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full / blocked — keep in-memory state */
  }
  listeners.forEach((l) => l());
}

const setLang = (lang: Lang) => commit((s) => ({ ...s, lang }));
const setSpeed = (speed: number) => commit((s) => ({ ...s, speed }));

const recordRun = (r: RunResult) =>
  commit((s) => ({
    ...s,
    last: r.partial ? s.last : { ...s.last, [slot(r.challengeId, r.mode)]: r },
    attempts: [
      ...s.attempts,
      {
        challengeId: r.challengeId,
        mode: r.mode,
        at: r.at,
        passed: r.passed,
        total: r.total,
        partial: r.partial,
        how: r.how ?? "auto",
        stuck: r.stuck ? `${r.stuck.testTitle} → ${r.stuck.stepLabel}` : null,
      },
    ].slice(-300),
  }));

const clearChallenge = (challengeId: string) =>
  commit((s) => ({
    ...s,
    attempts: s.attempts.filter((a) => a.challengeId !== challengeId),
    last: Object.fromEntries(Object.entries(s.last).filter(([k]) => !k.startsWith(`${challengeId}:`))),
  }));

const resetAll = () => commit((s) => ({ ...EMPTY, lang: s.lang, speed: s.speed }));

const noopSubscribe = () => () => {};

/** Progress lives in this browser only (localStorage) — nothing is sent to the server. */
export function usePracticeStore() {
  const store = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { store, ready, setLang, setSpeed, recordRun, clearChallenge, resetAll };
}
