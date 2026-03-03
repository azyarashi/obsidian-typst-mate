// https://doc.rust-lang.org/std/primitive.char.html
import { describe, expect, it } from 'bun:test';
import { isAsciiAlphanumeric, isNumeric, isWhiteSpace } from '@/utils/crates/std/char';

describe('char', () => {
  it('isWhiteSpace', () => {
    // ASCII whitespace
    expect(isWhiteSpace(' ')).toBe(true);
    expect(isWhiteSpace('\t')).toBe(true);
    expect(isWhiteSpace('\n')).toBe(true);
    expect(isWhiteSpace('\r')).toBe(true);
    expect(isWhiteSpace('\v')).toBe(true);
    expect(isWhiteSpace('\f')).toBe(true);
    // Unicode whitespace
    expect(isWhiteSpace('\u00A0')).toBe(true); // NO-BREAK SPACE
    expect(isWhiteSpace('\u2000')).toBe(true); // EN QUAD
    expect(isWhiteSpace('\u2028')).toBe(true); // LINE SEPARATOR
    expect(isWhiteSpace('\u2029')).toBe(true); // PARAGRAPH SEPARATOR
    expect(isWhiteSpace('\u3000')).toBe(true); // IDEOGRAPHIC SPACE
    // Not whitespace
    expect(isWhiteSpace('a')).toBe(false);
    expect(isWhiteSpace('0')).toBe(false);
    expect(isWhiteSpace('!')).toBe(false);
    expect(isWhiteSpace('越')).toBe(false);
    expect(isWhiteSpace('')).toBe(false);
  });

  it('isNumeric', () => {
    // Doc examples
    expect(isNumeric('٣')).toBe(true); // U+0663
    expect(isNumeric('7')).toBe(true);
    expect(isNumeric('৬')).toBe(true); // U+09EC
    expect(isNumeric('¾')).toBe(true); // U+00BE
    expect(isNumeric('①')).toBe(true); // U+2460
    expect(isNumeric('K')).toBe(false);
    expect(isNumeric('و')).toBe(false);
    expect(isNumeric('藏')).toBe(false);
    expect(isNumeric('三')).toBe(false);
    // ASCII digits
    expect(isNumeric('0')).toBe(true);
    expect(isNumeric('9')).toBe(true);
    // Unicode digits
    expect(isNumeric('\u0660')).toBe(true); // ARABIC-INDIC DIGIT ZERO
    expect(isNumeric('\u06F0')).toBe(true); // EXTENDED ARABIC-INDIC DIGIT ZERO
    expect(isNumeric('\u0966')).toBe(true); // DEVANAGARI DIGIT ZERO
    // Not numeric
    expect(isNumeric('a')).toBe(false);
    expect(isNumeric(' ')).toBe(false);
    expect(isNumeric('!')).toBe(false);
  });

  it('isAsciiAlphanumeric', () => {
    // Doc examples (is_ascii_alphabetic subset)
    expect(isAsciiAlphanumeric('A')).toBe(true);
    expect(isAsciiAlphanumeric('G')).toBe(true);
    expect(isAsciiAlphanumeric('a')).toBe(true);
    expect(isAsciiAlphanumeric('g')).toBe(true);
    expect(isAsciiAlphanumeric('z')).toBe(true);
    expect(isAsciiAlphanumeric('Z')).toBe(true);
    // Digits (alphanumeric includes digits)
    expect(isAsciiAlphanumeric('0')).toBe(true);
    expect(isAsciiAlphanumeric('9')).toBe(true);
    // Not ASCII alphanumeric
    expect(isAsciiAlphanumeric('%')).toBe(false);
    expect(isAsciiAlphanumeric(' ')).toBe(false);
    expect(isAsciiAlphanumeric('\n')).toBe(false);
    expect(isAsciiAlphanumeric('\x1b')).toBe(false); // ESC
    expect(isAsciiAlphanumeric('!')).toBe(false);
    expect(isAsciiAlphanumeric('\u00C0')).toBe(false); // À
    expect(isAsciiAlphanumeric('')).toBe(false);
  });
});
