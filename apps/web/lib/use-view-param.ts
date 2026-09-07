"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Tab / section state that survives a full page reload by mirroring itself into
 * a URL query param (e.g. `?view=payments`).
 *
 * - On mount it reads the param once and adopts it (falling back to
 *   `defaultValue`, and — if `allowed` is given — ignoring any value not in it).
 * - `setValue` updates the param via `history.replaceState`: no navigation, no
 *   extra history entry, no scroll jump. The param is dropped from the URL when
 *   the value equals `defaultValue`, keeping the canonical URL clean.
 *
 * SSR-safe: `window` is only touched inside effects / callbacks, so the first
 * render always matches the server (`defaultValue`); the URL value is applied on
 * the next tick.
 */
export function useViewParam(
  defaultValue: string,
  key = "view",
  allowed?: readonly string[],
): [string, (v: string) => void] {
  const [value, setValueState] = useState(defaultValue);

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get(key);
      if (fromUrl && (!allowed || allowed.includes(fromUrl))) {
        setValueState(fromUrl);
      }
    } catch {
      /* URL unavailable — stay on the default */
    }
    // Read once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = useCallback(
    (v: string) => {
      setValueState(v);
      try {
        const url = new URL(window.location.href);
        if (v === defaultValue) url.searchParams.delete(key);
        else url.searchParams.set(key, v);
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        /* URL unavailable — state still updates, just not persisted */
      }
    },
    [defaultValue, key],
  );

  return [value, setValue];
}
