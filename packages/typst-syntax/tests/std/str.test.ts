// https://doc.rust-lang.org/std/primitive.str.html#method.parse
import { describe, expect, it } from 'bun:test';
import { parseU64IsOk } from '@/std/str';

describe('str', () => {
  it('parseU64IsOk', () => {
    // Valid
    expect(parseU64IsOk('0')).toBe(true);
    expect(parseU64IsOk('1')).toBe(true);
    expect(parseU64IsOk('12345')).toBe(true);
    expect(parseU64IsOk('+0')).toBe(true);
    expect(parseU64IsOk('+123')).toBe(true);
    // u64::MAX = 18446744073709551615
    expect(parseU64IsOk('18446744073709551615')).toBe(true);
    // Overflow
    expect(parseU64IsOk('18446744073709551616')).toBe(false);
    expect(parseU64IsOk('99999999999999999999')).toBe(false);
    expect(parseU64IsOk('999999999999999999999')).toBe(false);
    // Negative
    expect(parseU64IsOk('-1')).toBe(false);
    // Invalid
    expect(parseU64IsOk('')).toBe(false);
    expect(parseU64IsOk('abc')).toBe(false);
    expect(parseU64IsOk('12a')).toBe(false);
    expect(parseU64IsOk('+')).toBe(false);
  });
});
