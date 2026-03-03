import { describe, expect, it } from 'vitest';
import {
  isAlphaNumericRegexMatched,
  isHangulRegexMatched,
  isHanRegexMatched,
  isHiraganaRegexMatched,
  isKatakanaRegexMatched,
} from './index';

describe('unicode_script', () => {
  it('isAlphaNumericRegexMatched', () => {
    // Latin letters
    expect(isAlphaNumericRegexMatched('a')).toBe(true);
    expect(isAlphaNumericRegexMatched('Z')).toBe(true);
    expect(isAlphaNumericRegexMatched('\u00C0')).toBe(true); // À
    expect(isAlphaNumericRegexMatched('\u00FF')).toBe(true); // ÿ
    // Digits
    expect(isAlphaNumericRegexMatched('0')).toBe(true);
    expect(isAlphaNumericRegexMatched('9')).toBe(true);
    // CJK
    expect(isAlphaNumericRegexMatched('\u4E00')).toBe(true); // 一
    // Hiragana
    expect(isAlphaNumericRegexMatched('\u3042')).toBe(true); // あ
    // Katakana
    expect(isAlphaNumericRegexMatched('\u30A2')).toBe(true); // ア
    // Hangul
    expect(isAlphaNumericRegexMatched('\uAC00')).toBe(true); // 가
    // Cyrillic
    expect(isAlphaNumericRegexMatched('\u0410')).toBe(true); // А
    // Arabic
    expect(isAlphaNumericRegexMatched('\u0627')).toBe(true); // ا
    // Devanagari
    expect(isAlphaNumericRegexMatched('\u0905')).toBe(true); // अ
    // Not alphanumeric
    expect(isAlphaNumericRegexMatched(' ')).toBe(false);
    expect(isAlphaNumericRegexMatched('!')).toBe(false);
    expect(isAlphaNumericRegexMatched('\u00A0')).toBe(false); // NO-BREAK SPACE
    expect(isAlphaNumericRegexMatched('\u2000')).toBe(false); // EN QUAD
    expect(isAlphaNumericRegexMatched('\u200B')).toBe(false); // ZERO WIDTH SPACE
    expect(isAlphaNumericRegexMatched('-')).toBe(false);
    expect(isAlphaNumericRegexMatched('.')).toBe(false);
    expect(isAlphaNumericRegexMatched('')).toBe(false);
    expect(isAlphaNumericRegexMatched('ab')).toBe(false);
  });

  it('isHanRegexMatched', () => {
    // CJK Unified Ideographs (U+4E00..U+9FFF)
    expect(isHanRegexMatched('\u4E00')).toBe(true); // 一
    expect(isHanRegexMatched('\u4E8C')).toBe(true); // 二
    expect(isHanRegexMatched('\u4E09')).toBe(true); // 三
    expect(isHanRegexMatched('\u5B57')).toBe(true); // 字
    expect(isHanRegexMatched('\u9FFF')).toBe(true);
    // CJK Unified Ideographs Extension A (U+3400..U+4DBF)
    expect(isHanRegexMatched('\u3400')).toBe(true);
    expect(isHanRegexMatched('\u4DBF')).toBe(true);
    // CJK Unified Ideographs Extension B (U+20000)
    expect(isHanRegexMatched('\u{20000}')).toBe(true);
    // CJK Compatibility Ideographs (U+F900..U+FAFF)
    expect(isHanRegexMatched('\uF900')).toBe(true);
    // Not Han
    expect(isHanRegexMatched('a')).toBe(false);
    expect(isHanRegexMatched('1')).toBe(false);
    expect(isHanRegexMatched('\u3042')).toBe(false); // あ (Hiragana)
    expect(isHanRegexMatched('\u30A2')).toBe(false); // ア (Katakana)
    expect(isHanRegexMatched('\uAC00')).toBe(false); // 가 (Hangul)
    expect(isHanRegexMatched('')).toBe(false);
    expect(isHanRegexMatched('字字')).toBe(false);
  });

  it('isHiraganaRegexMatched', () => {
    // Hiragana (U+3040..U+309F)
    expect(isHiraganaRegexMatched('\u3041')).toBe(true); // ぁ
    expect(isHiraganaRegexMatched('\u3042')).toBe(true); // あ
    expect(isHiraganaRegexMatched('\u3044')).toBe(true); // い
    expect(isHiraganaRegexMatched('\u304B')).toBe(true); // か
    expect(isHiraganaRegexMatched('\u3093')).toBe(true); // ん
    expect(isHiraganaRegexMatched('\u309D')).toBe(true); // ゝ
    expect(isHiraganaRegexMatched('\u309E')).toBe(true); // ゞ
    // Not Hiragana
    expect(isHiraganaRegexMatched('\u30A2')).toBe(false); // ア (Katakana)
    expect(isHiraganaRegexMatched('\u4E00')).toBe(false); // 一 (Han)
    expect(isHiraganaRegexMatched('\uAC00')).toBe(false); // 가 (Hangul)
    expect(isHiraganaRegexMatched('a')).toBe(false);
    expect(isHiraganaRegexMatched('')).toBe(false);
    expect(isHiraganaRegexMatched('ああ')).toBe(false);
  });

  it('isKatakanaRegexMatched', () => {
    // Katakana (U+30A0..U+30FF)
    expect(isKatakanaRegexMatched('\u30A1')).toBe(true); // ァ
    expect(isKatakanaRegexMatched('\u30A2')).toBe(true); // ア
    expect(isKatakanaRegexMatched('\u30A4')).toBe(true); // イ
    expect(isKatakanaRegexMatched('\u30AB')).toBe(true); // カ
    expect(isKatakanaRegexMatched('\u30F3')).toBe(true); // ン
    expect(isKatakanaRegexMatched('\u30FD')).toBe(true); // ヽ
    expect(isKatakanaRegexMatched('\u30FE')).toBe(true); // ヾ
    // Katakana Phonetic Extensions (U+31F0..U+31FF)
    expect(isKatakanaRegexMatched('\u31F0')).toBe(true); // ㇰ
    // Not Katakana
    expect(isKatakanaRegexMatched('\u3042')).toBe(false); // あ (Hiragana)
    expect(isKatakanaRegexMatched('\u4E00')).toBe(false); // 一 (Han)
    expect(isKatakanaRegexMatched('\uAC00')).toBe(false); // 가 (Hangul)
    expect(isKatakanaRegexMatched('a')).toBe(false);
    expect(isKatakanaRegexMatched('')).toBe(false);
    expect(isKatakanaRegexMatched('アア')).toBe(false);
  });

  it('isHangulRegexMatched', () => {
    // Hangul Syllables (U+AC00..U+D7AF)
    expect(isHangulRegexMatched('\uAC00')).toBe(true); // 가
    expect(isHangulRegexMatched('\uAC01')).toBe(true); // 각
    expect(isHangulRegexMatched('\uB098')).toBe(true); // 나
    expect(isHangulRegexMatched('\uD558')).toBe(true); // 하
    expect(isHangulRegexMatched('\uD7A3')).toBe(true); // 힣
    // Hangul Jamo (U+1100..U+11FF)
    expect(isHangulRegexMatched('\u1100')).toBe(true); // ᄀ
    expect(isHangulRegexMatched('\u1161')).toBe(true); // ᅡ
    expect(isHangulRegexMatched('\u11A8')).toBe(true); // ᆨ
    // Hangul Compatibility Jamo (U+3130..U+318F)
    expect(isHangulRegexMatched('\u3131')).toBe(true); // ㄱ
    expect(isHangulRegexMatched('\u314F')).toBe(true); // ㅏ
    // Not Hangul
    expect(isHangulRegexMatched('\u4E00')).toBe(false); // 一 (Han)
    expect(isHangulRegexMatched('\u3042')).toBe(false); // あ (Hiragana)
    expect(isHangulRegexMatched('\u30A2')).toBe(false); // ア (Katakana)
    expect(isHangulRegexMatched('a')).toBe(false);
    expect(isHangulRegexMatched('')).toBe(false);
    expect(isHangulRegexMatched('가나')).toBe(false);
  });
});
