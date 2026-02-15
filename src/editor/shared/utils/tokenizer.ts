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

export class TypstTokenizer {
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    const len = text.length;

    while (pos < len) {
      const char = text[pos] as string;

      if (/[a-zA-Z]/.test(char)) {
        let end = pos + 1;
        while (end < len && /[a-zA-Z.]/.test(text[end] as string)) end++;
        while (end > pos && text[end - 1] === '.') end--;

        if (end > pos) {
          const fullText = text.slice(pos, end);
          tokens.push({ type: 'sym', from: pos, to: end, text: fullText });
          pos = end;
          continue;
        }
      }

      if (char === '/' && text[pos + 1] === '/') {
        const end = text.indexOf('\n', pos);
        const to = end === -1 ? len : end;
        tokens.push({ type: 'comment', from: pos, to: to, text: text.slice(pos, to) });
        pos = to;
        continue;
      }
      if (char === '/' && text[pos + 1] === '*') {
        let depth = 1;
        let current = pos + 2;
        while (current < len && depth > 0) {
          if (text[current] === '/' && text[current + 1] === '*') {
            depth++;
            current += 2;
          } else if (text[current] === '*' && text[current + 1] === '/') {
            depth--;
            current += 2;
          } else current++;
        }
        const to = current;
        tokens.push({ type: 'comment', from: pos, to: to, text: text.slice(pos, to) });
        pos = to;
        continue;
      }

      if (char === '`') {
        let end = pos + 1;
        let isMultiLine = false;
        while (end < len) {
          if (text[end] === '\n') {
            isMultiLine = true;
            break;
          }
          if (text[end] === '`' && text[end - 1] !== '\\') {
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

      if (char === '"' || char === "'") {
        let end = pos + 1;
        let isMultiLine = false;
        while (end < len) {
          if (text[end] === '\n') {
            isMultiLine = true;
            break;
          }
          if (text[end] === char && text[end - 1] !== '\\') {
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

      if (char === '#' && text.startsWith('#CURSOR', pos)) {
        tokens.push({ type: 'null', from: pos, to: pos + 7, text: '#CURSOR' });
        pos += 7;
        continue;
      }
      if (char === '{' && text.startsWith('{CODE}', pos)) {
        tokens.push({ type: 'null', from: pos, to: pos + 6, text: '{CODE}' });
        pos += 6;
        continue;
      }

      if (char === '#') {
        let end = pos + 1;
        while (end < len && /[a-zA-Z0-9_-]/.test(text[end] as string)) end++;
        if (end > pos + 1) {
          tokens.push({ type: 'keyword', from: pos, to: end, text: text.slice(pos, end) });
          pos = end;
          continue;
        }
      }

      if ('()[]{}'.includes(char)) {
        tokens.push({ type: 'bracket', from: pos, to: pos + 1, text: char });
        pos++;
        continue;
      }

      pos++;
    }
    return tokens;
  }
}
