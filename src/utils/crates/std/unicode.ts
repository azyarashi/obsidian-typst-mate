const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

export function countGraphemes(s: string): number {
  let count = 0;
  for (const _ of segmenter.segment(s)) count++;
  return count;
}
