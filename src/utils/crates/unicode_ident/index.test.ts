// https://github.com/dtolnay/unicode-ident/blob/1.0.24/tests/compare.rs
import { describe, expect, it } from 'vitest';
import { isXidContinue, isXidStart } from './index';

describe('unicode_ident', () => {
  it('exhaustive ascii', () => {
    // ASCII range
    for (let code = 0x00; code <= 0x7f; code++) {
      const ch = String.fromCodePoint(code);
      const start = isXidStart(ch);
      const cont = isXidContinue(ch);

      if (
        (code >= 0x41 && code <= 0x5a) || // A-Z
        (code >= 0x61 && code <= 0x7a) // a-z
      ) {
        expect(start).toBe(true);
        expect(cont).toBe(true);
      } else if (code >= 0x30 && code <= 0x39) {
        // 0-9: XID_Continue but not XID_Start
        expect(start).toBe(false);
        expect(cont).toBe(true);
      } else if (code === 0x5f) {
        // underscore: XID_Continue but not XID_Start
        expect(start).toBe(false);
        expect(cont).toBe(true);
      } else {
        expect(start).toBe(false);
        expect(cont).toBe(false);
      }
    }
  });

  it('non-ascii xid_start', () => {
    // Latin Extended
    expect(isXidStart('\u00B5')).toBe(true); // µ
    expect(isXidStart('\u00C0')).toBe(true); // À
    expect(isXidStart('\u00FF')).toBe(true); // ÿ
    // Cyrillic
    expect(isXidStart('\u0400')).toBe(true); // Ѐ
    expect(isXidStart('\u0410')).toBe(true); // А
    expect(isXidStart('\u044F')).toBe(true); // я
    // Greek
    expect(isXidStart('\u0391')).toBe(true); // Α
    expect(isXidStart('\u03C9')).toBe(true); // ω
    // Arabic
    expect(isXidStart('\u0627')).toBe(true); // ا
    // Devanagari
    expect(isXidStart('\u0905')).toBe(true); // अ
    // CJK Unified Ideographs
    expect(isXidStart('\u4E00')).toBe(true); // 一
    expect(isXidStart('\u9FFF')).toBe(true);
    // Hiragana
    expect(isXidStart('\u3041')).toBe(true); // ぁ
    // Katakana
    expect(isXidStart('\u30A1')).toBe(true); // ァ
    // Hangul Syllables
    expect(isXidStart('\uAC00')).toBe(true); // 가
  });

  it('non-ascii not xid_start', () => {
    // General punctuation, symbols, control chars
    expect(isXidStart('\u00A0')).toBe(false); // NO-BREAK SPACE
    expect(isXidStart('\u00A1')).toBe(false); // ¡
    expect(isXidStart('\u00AB')).toBe(false); // «
    expect(isXidStart('\u00B0')).toBe(false); // °
    expect(isXidStart('\u2000')).toBe(false); // EN QUAD (space)
    expect(isXidStart('\u200B')).toBe(false); // ZERO WIDTH SPACE
    expect(isXidStart('\u2028')).toBe(false); // LINE SEPARATOR
    expect(isXidStart('\u2029')).toBe(false); // PARAGRAPH SEPARATOR
    expect(isXidStart('\uFEFF')).toBe(false); // BOM
    expect(isXidStart('\uFFFD')).toBe(false); // REPLACEMENT CHARACTER
  });

  it('non-ascii xid_continue but not xid_start', () => {
    // Combining marks: XID_Continue but not XID_Start
    expect(isXidStart('\u0300')).toBe(false); // COMBINING GRAVE ACCENT
    expect(isXidContinue('\u0300')).toBe(true);
    expect(isXidStart('\u0301')).toBe(false); // COMBINING ACUTE ACCENT
    expect(isXidContinue('\u0301')).toBe(true);
    expect(isXidStart('\u0308')).toBe(false); // COMBINING DIAERESIS
    expect(isXidContinue('\u0308')).toBe(true);
    // Devanagari vowel signs
    expect(isXidStart('\u093E')).toBe(false); // DEVANAGARI VOWEL SIGN AA
    expect(isXidContinue('\u093E')).toBe(true);
    // Arabic combining marks
    expect(isXidStart('\u064B')).toBe(false); // ARABIC FATHATAN
    expect(isXidContinue('\u064B')).toBe(true);
  });

  it('xid_start implies xid_continue', () => {
    expect(isXidStart('a')).toBe(true);
    expect(isXidContinue('a')).toBe(true);
    expect(isXidStart('Z')).toBe(true);
    expect(isXidContinue('Z')).toBe(true);
    expect(isXidStart('\u00B5')).toBe(true); // µ
    expect(isXidContinue('\u00B5')).toBe(true);
    expect(isXidStart('\u0391')).toBe(true); // Α
    expect(isXidContinue('\u0391')).toBe(true);
    expect(isXidStart('\u0410')).toBe(true); // А
    expect(isXidContinue('\u0410')).toBe(true);
    expect(isXidStart('\u0627')).toBe(true); // ا
    expect(isXidContinue('\u0627')).toBe(true);
    expect(isXidStart('\u0905')).toBe(true); // अ
    expect(isXidContinue('\u0905')).toBe(true);
    expect(isXidStart('\u3041')).toBe(true); // ぁ
    expect(isXidContinue('\u3041')).toBe(true);
    expect(isXidStart('\u30A1')).toBe(true); // ァ
    expect(isXidContinue('\u30A1')).toBe(true);
    expect(isXidStart('\u4E00')).toBe(true); // 一
    expect(isXidContinue('\u4E00')).toBe(true);
    expect(isXidStart('\uAC00')).toBe(true); // 가
    expect(isXidContinue('\uAC00')).toBe(true);
  });

  it('supplementary planes', () => {
    // Mathematical Bold Capital A (U+1D400) — XID_Start
    expect(isXidStart('\u{1D400}')).toBe(true);
    expect(isXidContinue('\u{1D400}')).toBe(true);
    // CJK Unified Ideograph Extension B (U+20000)
    expect(isXidStart('\u{20000}')).toBe(true);
    // Emoji — not identifiers
    expect(isXidStart('\u{1F600}')).toBe(false); // 😀
    expect(isXidContinue('\u{1F600}')).toBe(false);
    expect(isXidStart('\u{1F99A}')).toBe(false); // 🦚
    expect(isXidContinue('\u{1F99A}')).toBe(false);
  });

  it('non-single-char input', () => {
    expect(isXidStart('')).toBe(false);
    expect(isXidContinue('')).toBe(false);
    expect(isXidStart('ab')).toBe(false);
    expect(isXidContinue('ab')).toBe(false);
    expect(isXidStart('12')).toBe(false);
    expect(isXidContinue('12')).toBe(false);
  });
});
