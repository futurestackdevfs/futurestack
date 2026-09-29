/**
 * Zero-token "fact-check" guard. The writer is told to use only numbers that
 * appear in the research notes; any other number of substance is very likely
 * invented (a benchmark, a percentage, a version). Catching that in code costs
 * nothing — the model is only called again (once) when something is flagged.
 */
export function findUnsupportedNumbers(content: string, allowedText: string): string[] {
  const strip = (s: string) =>
    s
      .replace(/```[\s\S]*?```/g, ' ') // fenced code
      .replace(/`[^`\n]*`/g, ' ') // inline code
      .replace(/\bhttps?:\/\/\S+/g, ' ') // urls
      .replace(/^\s*\d+[.)]\s/gm, ' '); // "1. " list numbering

  const numbers = (s: string) => (strip(s).match(/\b\d[\d,]*(?:\.\d+)?%?/g) ?? []).map((n) => n.replace(/,/g, ''));

  const allowed = new Set(numbers(allowedText));
  const flagged: string[] = [];
  for (const n of numbers(content)) {
    const plain = n.replace('%', '');
    const isPercent = n.endsWith('%');
    const asInt = Number(plain);
    if (!isPercent && Number.isInteger(asInt) && asInt <= 10) continue; // "3 steps", "two of"
    if (!isPercent && Number.isInteger(asInt) && asInt >= 1990 && asInt <= 2035) continue; // years
    if (allowed.has(n) || allowed.has(plain)) continue;
    if (!flagged.includes(n)) flagged.push(n);
    if (flagged.length >= 10) break;
  }
  return flagged;
}
