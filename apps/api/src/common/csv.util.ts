/**
 * CSV helpers for exports that open in a spreadsheet (Excel, LibreOffice, Sheets).
 *
 * Two separate problems are handled for every text cell:
 *  1. Structure: RFC 4180 quoting - wrap in double quotes and double any embedded
 *     quote, so a comma, quote or newline in user data can't shift columns or
 *     inject extra rows.
 *  2. Formula injection: a cell that starts with = + - @ (or a tab / carriage
 *     return) is evaluated as a formula by spreadsheet software. Prefixing a
 *     single quote makes it plain text. Data such as a lead's "name" comes from
 *     anonymous visitors, so every text value is treated as untrusted.
 *
 * Numbers are written as-is (a legitimately negative amount must stay numeric).
 */
const FORMULA_LEADERS = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_LEADERS.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(',');
}
