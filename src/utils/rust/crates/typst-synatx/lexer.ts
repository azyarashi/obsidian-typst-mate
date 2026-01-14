import { Scanner } from '../unscanny';
import { SyntaxKind, SyntaxMode, type SyntaxNode, type SyntaxToken, type TypstSyntaxError } from '.';

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

const isNewline = (c: string) => c === '\n' || c === '\r';
const isSpace = (c: string, _mode: SyntaxMode) => {
  if (c === ' ' || c === '\t' || isNewline(c) || c === '\x0b' || c === '\x0c') return true;
  return false;
};

const isIdStart = (c: string) => /^\p{ID_Start}|_$/u.test(c);
const isIdContinue = (c: string) => /^\p{ID_Continue}|-$/u.test(c);

const isMathIdStart = (c: string) => /^\p{XID_Start}$/u.test(c);
const isMathIdContinue = (c: string) => /^\p{XID_Continue}$/u.test(c);

const isNumeric = (c: string) => /^[0-9]$/.test(c);

function countNewlines(s: string): number {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\n') count++;
    else if (s[i] === '\r') {
      if (i + 1 < s.length && s[i + 1] === '\n') i++;
      count++;
    }
  }
  return count;
}

export class TypstLexer {
  s: Scanner;
  mode: SyntaxMode;
  newline: boolean = false;
  atLineStart: boolean = true;
  error: TypstSyntaxError | null = null;

  constructor(text: string, mode: SyntaxMode = SyntaxMode.Markup) {
    this.s = new Scanner(text);
    this.mode = mode;
  }

  tokenize(): SyntaxToken[] {
    const tokens: SyntaxToken[] = [];

    while (!this.s.eof) {
      const node = this.next();
      this.flatten(node, tokens);
    }
    return tokens;
  }

  setMode(mode: SyntaxMode) {
    this.mode = mode;
  }

  get cursor() {
    return this.s.cursor;
  }

  jump(index: number) {
    this.s.jump(index);
  }

  hasNewline() {
    return this.newline;
  }

  // Mimic Rust Lexer next()
  next(): SyntaxNode {
    const start = this.s.cursor;
    this.newline = false;

    if (this.error) {
      const err = this.error;
      this.error = null;
      return {
        kind: SyntaxKind.Error,
        from: start,
        to: start,
        children: [],
        errors: [err],
      };
    }

    if (this.s.eof) {
      return this.leaf(SyntaxKind.End, start);
    }

    const c = this.s.peek();
    this.s.eat();

    let kind: SyntaxKind;

    if (isSpace(c, this.mode)) {
      kind = this.whitespace(start, c);
    } else if (c === '#' && start === 0 && this.s.eatIf('!')) {
      kind = this.shebang();
      this.atLineStart = false;
    } else if (c === '/' && this.s.eatIf('/')) {
      kind = this.lineComment();
      this.atLineStart = false;
    } else if (c === '/' && this.s.eatIf('*')) {
      kind = this.blockComment();
      this.atLineStart = false;
    } else if (c === '*' && this.s.eatIf('/')) {
      kind = this.makeError('unexpected end of block comment');
      this.atLineStart = false;
    } else if (c === '`' && this.mode !== SyntaxMode.Math) {
      this.atLineStart = false;
      return this.raw(start);
    } else {
      switch (this.mode) {
        case SyntaxMode.Markup:
          kind = this.markup(start, c);
          break;
        case SyntaxMode.Math: {
          const res = this.math(start, c);
          if (res.node) {
            this.atLineStart = false;
            return res.node;
          }
          kind = res.kind;
          break;
        }
        case SyntaxMode.Code:
          kind = this.code(start, c);
          break;
        default:
          kind = SyntaxKind.Error;
      }
      this.atLineStart = false;
    }

    if (this.error) {
      const err = this.error;
      this.error = null;
      err.from = start;
      err.to = this.s.cursor;
      return {
        kind: SyntaxKind.Error,
        from: start,
        to: this.s.cursor,
        children: [],
        errors: [err],
      };
    }

    return this.leaf(kind, start);
  }

  private leaf(kind: SyntaxKind, start: number): SyntaxNode {
    return {
      kind,
      from: start,
      to: this.s.cursor,
      children: [],
      mode: this.mode,
    };
  }

  private makeError(message: string): SyntaxKind {
    this.error = { message, from: 0, to: 0, hints: [] };
    return SyntaxKind.Error;
  }

  private whitespace(start: number, _c: string): SyntaxKind {
    this.s.eatWhile((x) => isSpace(x, this.mode));

    const text = this.s.string.slice(start, this.s.cursor);
    const newlines = countNewlines(text);

    this.newline = newlines > 0;
    if (newlines > 0) {
      this.atLineStart = true;
    }

    if (this.mode === SyntaxMode.Markup && newlines >= 2) {
      return SyntaxKind.Parbreak;
    } else {
      return SyntaxKind.Space;
    }
  }

  private shebang(): SyntaxKind {
    this.s.eatUntil(isNewline);
    return SyntaxKind.Shebang;
  }

  private lineComment(): SyntaxKind {
    this.s.eatUntil(isNewline);
    return SyntaxKind.LineComment;
  }

  private blockComment(): SyntaxKind {
    let state = '_';
    let depth = 1;

    while (!this.s.eof) {
      const c = this.s.eat()!;
      switch (state + c) {
        case '*/':
          depth--;
          state = '_';
          if (depth === 0) return SyntaxKind.BlockComment;
          break;
        case '/*':
          depth++;
          state = '_';
          break;
        default:
          state = c;
      }
    }
    return SyntaxKind.BlockComment;
  }

  private markup(start: number, c: string): SyntaxKind {
    switch (c) {
      case '\\':
        return this.backslash();
      case 'h':
        if (this.s.eatIf('ttp://') || this.s.eatIf('ttps://')) return this.link();
        break;
      case '<':
        if (isIdStart(this.s.peek())) return this.label();
        break;
      case '@':
        if (isIdStart(this.s.peek())) return this.refMarker();
        break;
      case '.':
        if (this.s.eatIf('..')) return SyntaxKind.Shorthand;
        break;
      case '-':
        if (this.s.eatIf('--')) return SyntaxKind.Shorthand;
        if (this.s.eatIf('-')) return SyntaxKind.Shorthand;
        if (this.s.eatIf('?')) return SyntaxKind.Shorthand;
        if (isNumeric(this.s.peek())) return SyntaxKind.Shorthand;
        if (this.spaceOrEnd()) return SyntaxKind.ListMarker;
        break;
      case '*':
        if (!this.inWord()) return SyntaxKind.Star;
        break;
      case '_':
        if (!this.inWord()) return SyntaxKind.Underscore;
        break;
      case '#':
        return SyntaxKind.Hash;
      case '[':
        return SyntaxKind.LeftBracket;
      case ']':
        return SyntaxKind.RightBracket;
      case "'":
        return SyntaxKind.SmartQuote;
      case '"':
        return SyntaxKind.SmartQuote;
      case '$':
        return SyntaxKind.Dollar;
      case '~':
        return SyntaxKind.Shorthand;
      case ':':
        return SyntaxKind.Colon;
      case '=':
        this.s.eatWhile((x) => x === '=');
        if (this.atLineStart && this.spaceOrEnd()) return SyntaxKind.HeadingMarker;
        return this.text();
      case '+':
        if (this.spaceOrEnd()) return SyntaxKind.EnumMarker;
        break;
      case '/':
        if (this.spaceOrEnd()) return SyntaxKind.TermMarker;
        break;
    }
    if (isNumeric(c)) return this.numbering(start);

    return this.text();
  }

  private backslash(): SyntaxKind {
    const c = this.s.peek();
    if (c === 'u' && this.s.scout(1) === '{') {
      this.s.eat(); // u
      this.s.eat(); // {
      this.s.eatWhile((x) => /[0-9a-fA-F]/.test(x));
      if (!this.s.eatIf('}')) return this.makeError('unclosed Unicode escape sequence');
      return SyntaxKind.Escape;
    }
    if (this.s.eof || isSpace(this.s.peek(), this.mode)) {
      return SyntaxKind.Linebreak;
    }
    this.s.eat();
    return SyntaxKind.Escape;
  }

  private raw(start: number): SyntaxNode {
    let backticks = 1;
    while (this.s.eatIf('`')) backticks++;

    if (backticks === 2) {
      return {
        kind: SyntaxKind.Raw,
        from: start,
        to: this.s.cursor,
        children: [
          this.manualLeaf(SyntaxKind.RawDelim, start, start + 1),
          this.manualLeaf(SyntaxKind.RawDelim, start + 1, start + 2),
        ],
      };
    }

    let found = 0;

    while (true) {
      if (this.s.eof) {
        return this.leaf(SyntaxKind.Error, start); // unclosed
      }
      if (this.s.eatIf('`')) {
        found++;
        if (found === backticks) break;
      } else {
        found = 0;
        this.s.eat();
      }
    }

    return this.leaf(SyntaxKind.Raw, start);
  }

  private link(): SyntaxKind {
    this.s.eatWhile((c) => !isSpace(c, this.mode) && c !== ')' && c !== ']');
    return SyntaxKind.Link;
  }

  private label(): SyntaxKind {
    this.s.eatWhile(isIdContinue);
    if (!this.s.eatIf('>')) return this.makeError('unclosed label');
    return SyntaxKind.Label;
  }

  private refMarker(): SyntaxKind {
    this.s.eatWhile(isIdContinue);
    return SyntaxKind.RefMarker;
  }

  private numbering(_start: number): SyntaxKind {
    this.s.eatWhile(isNumeric);
    if (this.s.eatIf('.') && this.spaceOrEnd()) {
      return SyntaxKind.EnumMarker;
    }
    return this.text();
  }

  private text(): SyntaxKind {
    const special = /^[ \t\n\u000b\u000c\r\\/[\]~\-.'"*_:h`$<>@#]/;
    this.s.eatUntil((c) => special.test(c));
    return SyntaxKind.Text;
  }

  private inWord(): boolean {
    const p = this.s.string[this.s.cursor - 2];
    const n = this.s.peek();
    const isAlphanumeric = (x: string | undefined) => x && /[a-zA-Z0-9]/.test(x);
    return !!(isAlphanumeric(p) && isAlphanumeric(n));
  }

  private spaceOrEnd(): boolean {
    return (
      this.s.eof ||
      isSpace(this.s.peek(), this.mode) ||
      (this.s.peek() === '/' && (this.s.scout(1) === '/' || this.s.scout(1) === '*'))
    );
  }

  private math(start: number, c: string): { kind: SyntaxKind; node?: SyntaxNode } {
    switch (c) {
      case '\\':
        return { kind: this.backslash() };
      case '"':
        return { kind: SyntaxKind.MathText, node: this.string(start) };
      case '.':
        return { kind: SyntaxKind.Dot };
      case ',':
        return { kind: SyntaxKind.Comma };
      case ';':
        return { kind: SyntaxKind.Semicolon };
      case ')':
        return { kind: SyntaxKind.RightParen };
      case '#':
        return { kind: SyntaxKind.Hash };
      case '_':
        return { kind: SyntaxKind.Underscore };
      case '$':
        return { kind: SyntaxKind.Dollar };
      case '/':
        return { kind: SyntaxKind.Slash };
      case '^':
        return { kind: SyntaxKind.Hat };
      case "'":
        return { kind: SyntaxKind.Prime };
      case '&':
        return { kind: SyntaxKind.MathAlignPoint };
      case '√':
      case '∛':
      case '∜':
        return { kind: SyntaxKind.Root };
    }

    if (isMathIdStart(c)) {
      this.s.eatWhile(isMathIdContinue);
      if (this.s.cursor - start === 1) return { kind: SyntaxKind.MathIdent };
      return { kind: SyntaxKind.MathIdent };
    }

    return { kind: SyntaxKind.MathText };
  }

  private code(start: number, c: string): SyntaxKind {
    switch (c) {
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        return this.number(start, c);
      case '"':
        return this.stringKind(start);
      case '{':
        return SyntaxKind.LeftBrace;
      case '}':
        return SyntaxKind.RightBrace;
      case '[':
        return SyntaxKind.LeftBracket;
      case ']':
        return SyntaxKind.RightBracket;
      case '(':
        return SyntaxKind.LeftParen;
      case ')':
        return SyntaxKind.RightParen;
      case '$':
        return SyntaxKind.Dollar;
      case ',':
        return SyntaxKind.Comma;
      case ';':
        return SyntaxKind.Semicolon;
      case ':':
        return SyntaxKind.Colon;
      case '.':
        if (this.s.eatIf('.')) return SyntaxKind.Dots;
        return SyntaxKind.Dot;
      case '+':
        if (this.s.eatIf('=')) return SyntaxKind.PlusEq;
        return SyntaxKind.Plus;
      case '-':
        if (this.s.eatIf('=')) return SyntaxKind.HyphEq;
        if (this.s.eatIf('>')) return SyntaxKind.Arrow;
        return SyntaxKind.Minus;
      case '*':
        if (this.s.eatIf('=')) return SyntaxKind.StarEq;
        return SyntaxKind.Star;
      case '/':
        if (this.s.eatIf('=')) return SyntaxKind.SlashEq;
        return SyntaxKind.Slash;
      case '=':
        if (this.s.eatIf('=')) return SyntaxKind.EqEq;
        if (this.s.eatIf('>')) return SyntaxKind.Arrow;
        return SyntaxKind.Eq;
      case '<':
        if (this.s.eatIf('=')) return SyntaxKind.LtEq;
        return SyntaxKind.Lt;
      case '>':
        if (this.s.eatIf('=')) return SyntaxKind.GtEq;
        return SyntaxKind.Gt;
      case '!':
        if (this.s.eatIf('=')) return SyntaxKind.ExclEq;
        return this.makeError('unexpected !');
    }

    if (isIdStart(c)) return this.ident(start);

    return this.makeError(`unexpected character: ${c}`);
  }

  private ident(start: number): SyntaxKind {
    this.s.eatWhile(isIdContinue);
    const text = this.s.string.slice(start, this.s.cursor);

    switch (text) {
      case 'let':
        return SyntaxKind.Let;
      case 'set':
        return SyntaxKind.Set;
      case 'show':
        return SyntaxKind.Show;
      case 'context':
        return SyntaxKind.Context;
      case 'if':
        return SyntaxKind.If;
      case 'else':
        return SyntaxKind.Else;
      case 'for':
        return SyntaxKind.For;
      case 'in':
        return SyntaxKind.In;
      case 'while':
        return SyntaxKind.While;
      case 'break':
        return SyntaxKind.Break;
      case 'continue':
        return SyntaxKind.Continue;
      case 'return':
        return SyntaxKind.Return;
      case 'import':
        return SyntaxKind.Import;
      case 'include':
        return SyntaxKind.Include;
      case 'as':
        return SyntaxKind.As;
      case 'none':
        return SyntaxKind.None;
      case 'auto':
        return SyntaxKind.Auto;
      case 'true':
      case 'false':
        return SyntaxKind.Bool;
    }

    if (text === '_') return SyntaxKind.Underscore;
    return SyntaxKind.Ident;
  }

  private number(_start: number, _c: string): SyntaxKind {
    this.s.eatWhile((x) => /[0-9a-zA-Z_.%]/.test(x));
    return SyntaxKind.Numeric;
  }

  private string(start: number): SyntaxNode {
    this.stringKind(start);
    return this.leaf(SyntaxKind.Str, start);
  }

  private stringKind(_start: number): SyntaxKind {
    while (!this.s.eof) {
      if (this.s.eatIf('\\')) {
        this.s.eat();
      } else if (this.s.eatIf('"')) {
        break;
      } else {
        this.s.eat();
      }
    }
    return SyntaxKind.Str;
  }

  private manualLeaf(kind: SyntaxKind, from: number, to: number): SyntaxNode {
    return { kind, from, to, children: [] };
  }

  public maybeMathNamedArg(start: number): SyntaxNode | null {
    const cursor = this.s.cursor;
    this.s.jump(start);
    if (isIdStart(this.s.peek())) {
      this.s.eatWhile(isIdContinue);
      if (this.s.peek() === ':' && this.s.scout(1) !== '=') {
        const node = this.leaf(SyntaxKind.Ident, start);
        this.s.jump(cursor); // Restore
        return node;
      }
    }
    this.s.jump(cursor);
    return null;
  }

  public maybeMathSpreadArg(start: number): SyntaxNode | null {
    const cursor = this.s.cursor;
    this.s.jump(start);
    if (this.s.eatIf('..')) {
      if (!this.spaceOrEnd() && this.s.peek() !== '.') {
        const node = this.leaf(SyntaxKind.Dots, start);
        this.s.jump(cursor);
        return node;
      }
    }
    this.s.jump(cursor);
    return null;
  }

  private flatten(node: SyntaxNode, tokens: SyntaxToken[]) {
    if (node.children.length === 0) {
      tokens.push({
        kind: node.kind,
        from: node.from,
        to: node.to,
        text: this.s.string.slice(node.from, node.to),
      });
    } else {
      for (const child of node.children) {
        if ('children' in child) {
          this.flatten(child as SyntaxNode, tokens);
        } else {
          tokens.push(child as SyntaxToken);
        }
      }
    }
  }
}
