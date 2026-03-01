const MAX_CODES = [49, 56, 52, 52, 54, 55, 52, 52, 48, 55, 51, 55, 48, 57, 53, 53, 49, 54, 49, 53];
const MAX_LEN = 20;

export function parseU64IsOk(s: string): boolean {
  const len = s.length;
  if (len === 0) return false;

  let i = 0;
  const c0 = s.charCodeAt(0);
  if (c0 === 43) i = 1;
  else if (c0 === 45) return false;

  if (i >= len) return false;

  const digitsLen = len - i;
  if (digitsLen < MAX_LEN) {
    for (let j = i; j < len; ++j) {
      const cc = s.charCodeAt(j);
      if (cc < 48 || 57 < cc) return false;
    }
    return true;
  }
  if (digitsLen > MAX_LEN) return false;

  for (let k = 0; k < MAX_LEN; ++k) {
    const cc = s.charCodeAt(i + k);
    if (cc < 48 || 57 < cc) return false;
    const mc = MAX_CODES[k]!;
    if (cc < mc) return true;
    if (mc < cc) return false;
  }

  return true;
}
