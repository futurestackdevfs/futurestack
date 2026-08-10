export const TOAST_EVENT = 'fs:toast';

// Coerce any payload to a string — NestJS validation errors surface `message`
// as an array, and API error bodies may carry non-string fields. The toast
// container calls `.toLowerCase()` on the message, so it must always be a
// string here.
export function showToast(message: unknown) {
  if (typeof window === 'undefined') return;
  const msg =
    typeof message === 'string'
      ? message
      : Array.isArray(message)
        ? message.map(String).join(', ')
        : String(message ?? '');
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: msg }));
}
