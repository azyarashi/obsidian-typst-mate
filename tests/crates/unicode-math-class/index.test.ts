// https://github.com/typst/unicode-math-class/blob/main/src/lib.rs
// Tests are based on the examples in the documentation of the original crate.

import { describe, expect, it } from 'bun:test';
import { MathClass } from '@/utils/crates/unicode-math-class/classes';
import { class_ } from '@/utils/crates/unicode-math-class/index';

describe('unicode_math_class', () => {
  it('doc examples', () => {
    expect(class_('0')).toBe(MathClass.Normal);
    expect(class_('a')).toBe(MathClass.Alphabetic);
    expect(class_('\u{1D538}')).toBe(MathClass.Alphabetic); // 𝔸
    expect(class_('+')).toBe(MathClass.Vary);
    expect(class_('\u00D7')).toBe(MathClass.Binary); // ×
    expect(class_('(')).toBe(MathClass.Opening);
    expect(class_(',')).toBe(MathClass.Punctuation);
    expect(class_('|')).toBe(MathClass.Fence);
    expect(class_('\u{1F603}')).toBe(undefined); // 😃
  });
});
