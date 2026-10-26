// Shared validation for the forms that generate leads (Free Career Guidance,
// Contact, ops "New Lead"). Returns one message per field so each form can show
// it right under the input instead of silently refusing to submit.

export type FieldErrors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Exactly 10 digits. Spaces/dashes are ignored; a +91 / 91 / 0 prefix is allowed. */
export function isValidPhone(raw: string): boolean {
  if (!/^[+\d\s-]+$/.test(raw)) return false;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10;
}

/** Letters, spaces, dots, hyphens and apostrophes only — no digits or symbols. */
const NAME_RE = /^\p{L}[\p{L}\s.'-]*$/u;

export function validateLeadFields(
  v: { name?: string; email?: string; phone?: string },
  opts: { emailRequired?: boolean; phoneRequired?: boolean } = {},
): FieldErrors {
  const errors: FieldErrors = {};
  const name = (v.name ?? "").trim();
  const email = (v.email ?? "").trim();
  const phone = (v.phone ?? "").trim();

  if (!name) errors.name = "Please enter your full name.";
  else if (name.length < 2) errors.name = "Full name must be at least 2 characters.";
  else if (!NAME_RE.test(name)) errors.name = "Full name can only contain letters and spaces.";

  if (!email) {
    if (opts.emailRequired) errors.email = "Please enter your email address.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address, e.g. name@example.com.";
  }

  if (!phone) {
    if (opts.phoneRequired) errors.phone = "Please enter your phone number.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Enter a valid 10-digit phone number.";
  }

  return errors;
}

/**
 * The API answers validation failures with `message` as a string or a list
 * ("email must be an email", "name must be longer than…"). Map each line onto
 * the field it names; anything unrecognised is returned as a general error.
 */
export function mapServerErrors(
  message: unknown,
  fields: string[],
): { fieldErrors: FieldErrors; general: string | null } {
  const lines = Array.isArray(message) ? message.map(String) : message ? [String(message)] : [];
  const fieldErrors: FieldErrors = {};
  const general: string[] = [];

  for (const line of lines) {
    const field = fields.find((f) => new RegExp(`^${f}\\b`, "i").test(line.trim()));
    if (field && !fieldErrors[field]) {
      fieldErrors[field] =
        field === "email" ? "Enter a valid email address."
        : field === "name" ? "Please enter a valid name (at least 2 characters)."
        : field === "phone" ? "Enter a valid phone number."
        : line.charAt(0).toUpperCase() + line.slice(1) + ".";
    } else {
      general.push(line);
    }
  }

  return { fieldErrors, general: general.length ? general.join(" ") : null };
}
