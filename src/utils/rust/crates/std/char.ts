// https://doc.rust-lang.org/std/primitive.char.html#method.is_whitespace
export function isWhiteSpace(c: string): boolean {
  const cp = c.codePointAt(0)!;

  if (c === ' ' || (cp >= 0x09 && cp <= 0x0d)) return true;
  return cp <= 0x7f ? false : /\p{White_Space}/u.test(c);
}
