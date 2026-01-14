// https://github.com/typst/unscanny/blob/v0.1/src/lib.rs
export class Scanner {
  readonly string: string;
  cursor: number = 0;
  readonly len: number;

  constructor(string: string) {
    this.string = string;
    this.len = string.length;
  }

  get done(): boolean {
    return this.len <= this.cursor;
  }

  get eof(): boolean {
    return this.done;
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
    if (this.done) return false;
    const char = this.string[this.cursor] || '';

    if (typeof pattern === 'string') return this.string.startsWith(pattern, this.cursor);
    else if (Array.isArray(pattern)) {
      for (const s of pattern) if (this.string.startsWith(s, this.cursor)) return true;
      return false;
    } else if (pattern instanceof RegExp) return pattern.test(char);
    else return pattern(char);
  }

  scout(n: number): string {
    return this.string[this.cursor + n] ?? '';
  }

  locate(n: number): number {
    const target = this.cursor + n;
    if (target > this.len) return this.len;
    return target;
  }

  // --- Consuming ---

  eat(): string | null {
    if (this.done) return null;
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

  eatIf(pattern: string | RegExp | ((char: string) => boolean)): boolean {
    if (this.done) return false;
    const char = this.string[this.cursor] || '';
    let matched = false;
    let len = 0;

    if (typeof pattern === 'string') {
      if (this.string.startsWith(pattern, this.cursor)) {
        matched = true;
        len = pattern.length;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(char)) {
        matched = true;
        len = 1;
      }
    } else {
      if (pattern(char)) {
        matched = true;
        len = 1;
      }
    }

    if (matched) {
      this.cursor += len;
      return true;
    }
    return false;
  }

  eatWhile(pattern: string | RegExp | ((char: string) => boolean)): string {
    const start = this.cursor;
    while (!this.done) {
      const char = this.string[this.cursor] || '';
      let matched = false;
      if (typeof pattern === 'string') {
        matched = char === pattern;
      } else if (pattern instanceof RegExp) {
        matched = pattern.test(char);
      } else {
        matched = pattern(char);
      }

      if (matched) {
        this.cursor++;
      } else {
        break;
      }
    }
    return this.string.slice(start, this.cursor);
  }

  eatUntil(pattern: string | RegExp | ((char: string) => boolean)): string {
    const start = this.cursor;
    while (!this.done) {
      const char = this.string[this.cursor] || '';
      let matched = false;
      if (typeof pattern === 'string') {
        matched = char === pattern;
      } else if (pattern instanceof RegExp) {
        matched = pattern.test(char);
      } else {
        matched = pattern(char);
      }

      if (!matched) {
        this.cursor++;
      } else {
        break;
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
}

/*
 * x ?? o ||
 * x .at o []
 * x .min/max o if
 * x forEach o for of
 */
