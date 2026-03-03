// https://github.com/typst/unscanny/blob/v0.1/src/lib.rs
export class Scanner {
  readonly string: string;
  cursor: number = 0;
  readonly len: number;

  constructor(string: string) {
    this.string = string;
    this.len = string.length;
  }

  done(): boolean {
    return this.len <= this.cursor;
  }
  // --- Slicing ---

  before(): string {
    return this.string.slice(0, this.cursor);
  }

  after(): string {
    return this.string.slice(this.cursor);
  }

  parts(): [string, string] {
    return [this.before(), this.after()];
  }

  from(start: number): string {
    return this.string.slice(start, this.cursor);
  }

  to(end: number): string {
    return this.string.slice(this.cursor, end);
  }

  get(start: number, end: number): string {
    return this.string.slice(start, end);
  }

  // --- Peeking ---

  peek(): string {
    return this.string[this.cursor] || '';
  }

  at(pattern: string | RegExp | ((char: string) => boolean) | string[]): boolean {
    if (typeof pattern === 'string') return this.string.startsWith(pattern, this.cursor);
    if (Array.isArray(pattern)) {
      for (const s of pattern) if (this.string.startsWith(s, this.cursor)) return true;
      return false;
    }
    if (this.done()) return false;
    const char = this.string[this.cursor] || '';
    if (pattern instanceof RegExp) return pattern.test(char);
    return pattern(char);
  }

  scout(n: number): string {
    return this.string[this.cursor + n] || '';
  }

  locate(n: number): number {
    return Math.max(0, Math.min(this.cursor + n, this.len));
  }

  // --- Consuming ---

  eat(): string | null {
    if (this.done()) return null;
    const char = this.string[this.cursor];
    this.cursor++;
    return char || null;
  }

  uneat(): string | null {
    if (this.cursor > 0) {
      this.cursor--;
      return this.string[this.cursor] || null;
    }
    return null;
  }

  // TODO
  eatIf(pattern: string | RegExp | ((char: string) => boolean)): boolean {
    if (typeof pattern === 'string') {
      if (!this.string.startsWith(pattern, this.cursor)) return false;
      this.cursor += pattern.length;
      return true;
    }

    if (this.done()) return false;
    const char = this.string[this.cursor] || '';
    const matched = pattern instanceof RegExp ? pattern.test(char) : pattern(char);
    if (!matched) return false;
    this.cursor++;
    return true;
  }

  // TODO
  eatWhile(pattern: string | RegExp | ((char: string) => boolean)): string {
    const start = this.cursor;
    if (typeof pattern === 'string') {
      while (this.string.startsWith(pattern, this.cursor)) {
        if (pattern.length === 0) break;
        this.cursor += pattern.length;
      }
    } else {
      while (!this.done()) {
        const char = this.string[this.cursor] || '';
        if (pattern instanceof RegExp ? pattern.test(char) : pattern(char)) this.cursor++;
        else break;
      }
    }
    return this.string.slice(start, this.cursor);
  }

  // TODO
  eatUntil(pattern: string | RegExp | ((char: string) => boolean)): string {
    const start = this.cursor;
    if (typeof pattern === 'string') {
      while (!this.done() && !this.string.startsWith(pattern, this.cursor)) {
        this.cursor++;
      }
    } else {
      while (!this.done()) {
        const char = this.string[this.cursor] || '';
        if (pattern instanceof RegExp ? pattern.test(char) : pattern(char)) break;
        else this.cursor++;
      }
    }
    return this.string.slice(start, this.cursor);
  }

  eatWhitespace(): string {
    return this.eatWhile((c) => /\s/.test(c));
  }

  expect(pattern: string): void {
    if (!this.eatIf(pattern)) throw new Error(`Expected '${pattern}' at position ${this.cursor}`);
  }

  // --- Motion ---

  jump(pos: number): void {
    if (pos < 0) this.cursor = 0;
    else if (pos > this.len) this.cursor = this.len;
    else this.cursor = pos;
  }

  advance(n: number = 1): void {
    const target = this.cursor + n;
    if (target > this.len) this.cursor = this.len;
    else this.cursor = target;
  }

  // --- Debug ---

  toString(): string {
    const [before, after] = this.parts();
    let s = 'Scanner(';
    if (before) s += `"${before}" `;
    s += '|';
    if (after) s += ` "${after}"`;
    s += ')';
    return s;
  }
}
