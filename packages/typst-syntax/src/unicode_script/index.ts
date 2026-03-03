export function isAlphaNumericRegexMatched(c: string): boolean {
  return /^[\p{L}\p{N}]$/u.test(c);
}

export function isHanRegexMatched(c: string): boolean {
  return /^\p{Script=Han}$/u.test(c);
}

export function isHiraganaRegexMatched(c: string): boolean {
  return /^\p{Script=Hiragana}$/u.test(c);
}

export function isKatakanaRegexMatched(c: string): boolean {
  return /^\p{Script=Katakana}$/u.test(c);
}

export function isHangulRegexMatched(c: string): boolean {
  return /^\p{Script=Hangul}$/u.test(c);
}
