// https://doc.rust-lang.org/std/primitive.char.html#method.is_whitespace
const UNICODE_WS = /\p{White_Space}/u;

export function isWhiteSpace(c: string): boolean {
  if (!c) return false;
  const cu = c.charCodeAt(0);

  if (cu === 0x20) return true; // ' '
  if (cu >= 0x09 && cu <= 0x0d) return true; // \t \n \v \f \r
  if (cu <= 0x7f) return false; // other ASCII -> not whitespace

  return UNICODE_WS.test(c);
}

const UNICODE_NUM = /\p{Number}/u;

export function isNumeric(c: string): boolean {
  const cp = c.codePointAt(0)!;

  if (c >= '0' && c <= '9') return true;
  return cp <= 0x7f ? false : UNICODE_NUM.test(c);
}

export function isAsciiAlphanumeric(ch: string): boolean {
  if (!ch) return false;
  const c = ch.charCodeAt(0);

  return (
    (c >= 0x30 && c <= 0x39) || // 0-9
    (c >= 0x41 && c <= 0x5a) || // A-Z
    (c >= 0x61 && c <= 0x7a) // a-z
  );
}
