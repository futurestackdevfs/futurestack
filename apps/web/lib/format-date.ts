// Shared date/time display helpers — always render in IST (Asia/Kolkata)
// regardless of the viewer's browser/OS timezone. The backend stores and
// sends UTC timestamps everywhere (Postgres `timestamp`, JS `Date`/ISO
// strings) — that's correct and shouldn't change. This is purely a display
// concern: an admin/trainer/student sitting outside IST (or a machine with a
// misconfigured OS timezone) would otherwise see a different wall-clock time
// than everyone else for the exact same event.
//
// Use these instead of bare `.toLocaleDateString()` / `.toLocaleString()` for
// anything shown to a user. Don't use them for `<input type="date"|"datetime-local">`
// values — those need the browser-local ISO slice, not a formatted IST string.

const IST = "Asia/Kolkata";

/** e.g. "11 Sep 2026" */
export function formatDateIST(input: string | number | Date): string {
  return new Date(input).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "11 Sep 2026, 1:26 pm" */
export function formatDateTimeIST(input: string | number | Date): string {
  return new Date(input).toLocaleString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** e.g. "1:26 pm" */
export function formatTimeIST(input: string | number | Date): string {
  return new Date(input).toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
