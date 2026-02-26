export interface Token {
  type: 'bracket' | 'string' | 'null' | 'keyword' | 'comment' | 'monospace' | 'sym';
  from: number;
  to: number;
  text: string;
}

export const OPEN_MAP: Record<string, string> = {
  ')': '(',
  ']': '[',
  '}': '{',
};

export const BRACKET_MAP: Record<string, string> = {
  '(': 'paren',
  ')': 'paren',
  '[': 'bracket',
  ']': 'bracket',
  '{': 'brace',
  '}': 'brace',
};

function isAlpha(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122); // A-Z, a-z
}

function isAlphaOrDot(code: number): boolean {
  return isAlpha(code) || code === 46; // '.'
}

function isAlphaNumericOrDash(code: number): boolean {
  return isAlpha(code) || (code >= 48 && code <= 57) || code === 95 || code === 45; // a-zA-Z0-9_-
}

export class TypstTokenizer {
  tokenize(text: string, options?: { includeSym?: boolean }): Token[] {
    const { includeSym = true } = options || {};
    const tokens: Token[] = [];
    let pos = 0;
    const len = text.length;

    while (pos < len) {
      const charCode = text.charCodeAt(pos);

      if (isAlpha(charCode)) {
        let end = pos + 1;
        while (end < len && isAlphaOrDot(text.charCodeAt(end))) end++;
        while (end > pos && text.charCodeAt(end - 1) === 46 /* '.' */) end--;

        if (end > pos) {
          if (includeSym) tokens.push({ type: 'sym', from: pos, to: end, text: text.slice(pos, end) });
          pos = end;
          continue;
        }
      }

      if (charCode === 47 /* '/' */ && text.charCodeAt(pos + 1) === 47 /* '/' */) {
        const end = text.indexOf('\n', pos);
        const to = end === -1 ? len : end;
        tokens.push({ type: 'comment', from: pos, to: to, text: text.slice(pos, to) });
        pos = to;
        continue;
      }
      if (charCode === 47 /* '/' */ && text.charCodeAt(pos + 1) === 42 /* '*' */) {
        let depth = 1;
        let current = pos + 2;
        while (current < len && depth > 0) {
          const c = text.charCodeAt(current);
          if (c === 47 /* '/' */ && text.charCodeAt(current + 1) === 42 /* '*' */) {
            depth++;
            current += 2;
          } else if (c === 42 /* '*' */ && text.charCodeAt(current + 1) === 47 /* '/' */) {
            depth--;
            current += 2;
          } else current++;
        }
        const to = current;
        tokens.push({ type: 'comment', from: pos, to: to, text: text.slice(pos, to) });
        pos = to;
        continue;
      }

      if (charCode === 96 /* '`' */) {
        let end = pos + 1;
        let isMultiLine = false;
        while (end < len) {
          const ec = text.charCodeAt(end);
          if (ec === 10 /* '\n' */) {
            isMultiLine = true;
            break;
          }
          if (ec === 96 /* '`' */ && text.charCodeAt(end - 1) !== 92 /* '\\' */) {
            end++;
            break;
          }
          end++;
        }
        if (!isMultiLine) {
          tokens.push({ type: 'monospace', from: pos, to: end, text: text.slice(pos, end) });
          pos = end;
          continue;
        }
      }

      if (charCode === 34 /* '"' */ || charCode === 39 /* "'" */) {
        let end = pos + 1;
        let isMultiLine = false;
        while (end < len) {
          const ec = text.charCodeAt(end);
          if (ec === 10 /* '\n' */) {
            isMultiLine = true;
            break;
          }
          if (ec === charCode && text.charCodeAt(end - 1) !== 92 /* '\\' */) {
            end++;
            break;
          }
          end++;
        }
        if (!isMultiLine) {
          tokens.push({ type: 'string', from: pos, to: end, text: text.slice(pos, end) });
          pos = end;
          continue;
        }
      }

      if (charCode === 35 /* '#' */ && text.startsWith('#CURSOR', pos)) {
        tokens.push({ type: 'null', from: pos, to: pos + 7, text: '#CURSOR' });
        pos += 7;
        continue;
      }
      if (charCode === 123 /* '{' */ && text.startsWith('{CODE}', pos)) {
        tokens.push({ type: 'null', from: pos, to: pos + 6, text: '{CODE}' });
        pos += 6;
        continue;
      }

      if (charCode === 35 /* '#' */) {
        let end = pos + 1;
        while (end < len && isAlphaNumericOrDash(text.charCodeAt(end))) end++;
        if (end > pos + 1) {
          tokens.push({ type: 'keyword', from: pos, to: end, text: text.slice(pos, end) });
          pos = end;
          continue;
        }
      }

      // '(' = 40, ')' = 41, '[' = 91, ']' = 93, '{' = 123, '}' = 125
      if (
        charCode === 40 ||
        charCode === 41 ||
        charCode === 91 ||
        charCode === 93 ||
        charCode === 123 ||
        charCode === 125
      ) {
        tokens.push({ type: 'bracket', from: pos, to: pos + 1, text: String.fromCharCode(charCode) });
        pos++;
        continue;
      }

      pos++;
    }
    return tokens;
  }
}
