// https://doc.rust-lang.org/std/string/struct.String.html
import { describe, expect, it } from 'bun:test';
import { countGraphemes } from './unicode';

describe('unicode', () => {
  it('countGraphemes', () => {
    expect(countGraphemes('')).toBe(0);
    expect(countGraphemes('hello')).toBe(5);
    expect(countGraphemes('ä')).toBe(1);
    // Emoji
    expect(countGraphemes('😀')).toBe(1);
    expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1); // family emoji (ZWJ sequence)
    expect(countGraphemes('🇯🇵')).toBe(1); // flag
    // Combined characters
    expect(countGraphemes('e\u0301')).toBe(1); // é as e + combining acute
    expect(countGraphemes('abc💛def')).toBe(7);
  });
});
