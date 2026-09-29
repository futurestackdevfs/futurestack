import { findUnsupportedNumbers } from './numbers';

const allowed = 'Default highWaterMark is 16384 bytes. Version 22 of Node. Costs 1,500 dollars. 30% of users.';

describe('findUnsupportedNumbers', () => {
  it('flags figures that are not in the allowed text', () => {
    expect(findUnsupportedNumbers('It is 47% faster and handles 3182 ops/sec.', allowed)).toEqual(['47%', '3182']);
  });

  it('accepts figures present in the allowed text (commas and % normalised)', () => {
    expect(findUnsupportedNumbers('Uses 16384 bytes, 1500 dollars, on Node 22, for 30% of users.', allowed)).toEqual([]);
    expect(findUnsupportedNumbers('Costs 1,500 dollars.', allowed)).toEqual([]);
  });

  it('ignores small counts, years, list numbering, code and URLs', () => {
    const md = [
      '1. First step',
      '2) Second step',
      'There are 3 options and 10 items, updated in 2024 (or 1999).',
      'See https://example.com/v2/12345 for details.',
      'Inline `const x = 424242` is fine.',
      '```js',
      'const big = 99999999;',
      '```',
    ].join('\n');
    expect(findUnsupportedNumbers(md, '')).toEqual([]);
  });

  it('still flags small percentages (only bare small counts are ignored)', () => {
    expect(findUnsupportedNumbers('Roughly 5% better.', '')).toEqual(['5%']);
    expect(findUnsupportedNumbers('Roughly 5% better.', 'Improves by 5%.')).toEqual([]);
  });

  it('de-duplicates and caps the result', () => {
    const many = Array.from({ length: 30 }, (_, i) => `value ${100 + i}`).join(' ') + ' value 100';
    const out = findUnsupportedNumbers(many, '');
    expect(out).toHaveLength(10);
    expect(new Set(out).size).toBe(10);
  });

  it('handles decimals', () => {
    expect(findUnsupportedNumbers('Takes 3.75 seconds.', '')).toEqual(['3.75']);
    expect(findUnsupportedNumbers('Takes 3.75 seconds.', 'about 3.75 seconds')).toEqual([]);
  });
});
