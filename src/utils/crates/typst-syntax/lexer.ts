import { isAsciiAlphanumeric, isNumeric, isWhiteSpace } from '../std/char';
import { isXidContinue, isXidStart } from '../unicode_ident';
import {
  isAlphaNumericRegexMatched,
  isHangulRegexMatched,
  isHanRegexMatched,
  isHiraganaRegexMatched,
  isKatakanaRegexMatched,
} from '../unicode_script';
import { Scanner } from '../unscanny';
import { SyntaxMode } from '.';
import { SyntaxKind } from './kind';
import { SyntaxErrorNode, SyntaxNode } from './node';

export class Lexer {
  public s: Scanner;
  public mode: SyntaxMode;
  public newline: boolean;
  private error_: SyntaxErrorNode | null;

  constructor(text: string, mode: SyntaxMode) {
    this.s = new Scanner(text);
    this.mode = mode;
    this.newline = false;
    this.error_ = null;
  }

  public setMode(mode: SyntaxMode) {
    this.mode = mode;
  }

  public cursor(): number {
    return this.s.cursor;
  }

  public jump(index: number) {
    this.s.jump(index);
  }

  public column(index: number): number {
    const s = new Scanner(this.s.string);
    s.jump(index);
    let count = 0;
    const before = s.before();
    for (let i = before.length - 1; i >= 0; i--) {
      const c = before[i]!;
      if (isNewline(c)) break;
      count++;
    }
    return count;
  }

  private error(message: string): SyntaxKind {
    this.error_ = SyntaxErrorNode.new(message);
    return SyntaxKind.Error;
  }

  private hint(message: string) {
    if (this.error_) this.error_.hints.push(message);
  }

  public next(): [SyntaxKind, SyntaxNode] {
    const start = this.s.cursor;

    this.newline = false;
    let kind: SyntaxKind = SyntaxKind.End;
    const c = this.s.eat();

    if (c !== null && isSpace(c, this.mode)) kind = this.whitespace(start, c);
    else if (c === '#' && start === 0 && this.s.eatIf('!')) kind = this.shebang();
    else if (c === '/' && this.s.eatIf('/')) kind = this.lineComment();
    else if (c === '/' && this.s.eatIf('*')) kind = this.blockComment();
    else if (c === '*' && this.s.eatIf('/')) {
      kind = this.error('unexpected end of block comment');
      this.hint('consider escaping the `*` with a backslash or opening the block comment with `/*`');
    } else if (c === '`' && this.mode !== SyntaxMode.Math) return this.raw();
    else if (c !== null) {
      switch (this.mode) {
        case SyntaxMode.Markup:
          kind = this.markup(start, c);
          break;
        case SyntaxMode.Math: {
          const [k, node] = this.math(start, c);
          if (node) return [k, node];
          kind = k;
          break;
        }
        case SyntaxMode.Code:
          kind = this.code(start, c);
          break;
        default:
          kind = SyntaxKind.Error;
      }
    } else kind = SyntaxKind.End;

    const text = this.s.from(start);
    let node: SyntaxNode;
    if (this.error_) {
      node = SyntaxNode.error(this.error_, text);
      this.error_ = null;
    } else node = SyntaxNode.leaf(kind, text);

    return [kind, node];
  }

  private whitespace(start: number, c: string): SyntaxKind {
    const more = this.s.eatWhile((ch) => isSpace(ch, this.mode));
    let newlines = 0;
    if (c === ' ' && more.length === 0) newlines = 0;
    else newlines = countNewlines(this.s.from(start));

    this.newline = newlines > 0;
    if (this.mode === SyntaxMode.Markup && newlines >= 2) return SyntaxKind.Parbreak;
    else return SyntaxKind.Space;
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

    let c = this.s.eat();
    while (c !== null) {
      if (state === '*' && c === '/') {
        depth -= 1;
        if (depth === 0) break;
        state = '_';
      } else if (state === '/' && c === '*') {
        depth += 1;
        state = '_';
      } else state = c;
      c = this.s.eat();
    }

    return SyntaxKind.BlockComment;
  }

  private markup(start: number, c: string): SyntaxKind {
    if (c === '\\') return this.backslash();
    if (c === 'h' && this.s.eatIf('ttp://')) return this.link();
    if (c === 'h' && this.s.eatIf('ttps://')) return this.link();
    if (c === '<' && this.s.at(isIdContinue)) return this.label();
    if (c === '@' && this.s.at(isIdContinue)) return this.refMarker();

    if (c === '.' && this.s.eatIf('..')) return SyntaxKind.Shorthand;
    if (c === '-' && this.s.eatIf('--')) return SyntaxKind.Shorthand;
    if (c === '-' && this.s.eatIf('-')) return SyntaxKind.Shorthand;
    if (c === '-' && this.s.eatIf('?')) return SyntaxKind.Shorthand;
    if (c === '-' && this.s.at(isNumeric)) return SyntaxKind.Shorthand;
    if (c === '*' && !this.inWord()) return SyntaxKind.Star;
    if (c === '_' && !this.inWord()) return SyntaxKind.Underscore;

    if (c === '#') return SyntaxKind.Hash;
    if (c === '[') return SyntaxKind.LeftBracket;
    if (c === ']') return SyntaxKind.RightBracket;
    if (c === "'") return SyntaxKind.SmartQuote;
    if (c === '"') return SyntaxKind.SmartQuote;
    if (c === '$') return SyntaxKind.Dollar;
    if (c === '~') return SyntaxKind.Shorthand;
    if (c === ':') return SyntaxKind.Colon;
    if (c === '=') {
      this.s.eatWhile('=');
      if (this.spaceOrEnd()) return SyntaxKind.HeadingMarker;
      else return this.text();
    }
    if (c === '-' && this.spaceOrEnd()) return SyntaxKind.ListMarker;
    if (c === '+' && this.spaceOrEnd()) return SyntaxKind.EnumMarker;
    if (c === '/' && this.spaceOrEnd()) return SyntaxKind.TermMarker;
    if (/^[0-9]$/.test(c)) return this.numbering(start);

    return this.text();
  }

  private backslash(): SyntaxKind {
    if (this.s.eatIf('u{')) {
      const hex = this.s.eatWhile(isAsciiAlphanumeric);
      if (!this.s.eatIf('}')) return this.error('unclosed Unicode escape sequence');

      // TODO: u32::from_str_radix
      const codepoint = parseInt(hex, 16);
      if (Number.isNaN(codepoint) || codepoint > 0x10ffff) return this.error(`invalid Unicode codepoint: ${hex}`);

      return SyntaxKind.Escape;
    }

    if (this.s.done() || this.s.at(isWhiteSpace)) return SyntaxKind.Linebreak;
    else {
      this.s.eat();
      return SyntaxKind.Escape;
    }
  }

  // TODO: raw, blocky_raw, inline_raw
  private raw(): [SyntaxKind, SyntaxNode] {
    const start = this.s.cursor - 1;

    let backticks = 1;
    while (this.s.eatIf('`')) {
      backticks++;
    }

    if (backticks === 2) {
      const nodes = [SyntaxNode.leaf(SyntaxKind.RawDelim, '`'), SyntaxNode.leaf(SyntaxKind.RawDelim, '`')];
      return [SyntaxKind.Raw, SyntaxNode.inner(SyntaxKind.Raw, nodes)];
    }

    let found = 0;
    while (found < backticks) {
      const c = this.s.eat();
      if (c === '`') {
        found++;
      } else if (c !== null) {
        found = 0;
      } else {
        const msg = SyntaxErrorNode.new('unclosed raw text');
        const error = SyntaxNode.error(msg, this.s.from(start));
        return [SyntaxKind.Error, error];
      }
    }
    const end = this.s.cursor;

    const nodes: SyntaxNode[] = [];
    let prevStart = start;

    const pushRaw = (kind: SyntaxKind, s: Scanner) => {
      nodes.push(SyntaxNode.leaf(kind, s.from(prevStart)));
      prevStart = s.cursor;
    };

    this.s.jump(start + backticks);
    pushRaw(SyntaxKind.RawDelim, this.s);

    if (backticks >= 3) {
      this.blockyRaw(end - backticks, pushRaw);
    } else {
      this.inlineRaw(end - backticks, pushRaw);
    }

    this.s.jump(end);
    pushRaw(SyntaxKind.RawDelim, this.s);

    return [SyntaxKind.Raw, SyntaxNode.inner(SyntaxKind.Raw, nodes)];
  }

  private blockyRaw(innerEnd: number, pushRaw: (kind: SyntaxKind, s: Scanner) => void) {
    if (this.s.eatIf(isIdStart)) {
      this.s.eatWhile(isIdContinue);
      pushRaw(SyntaxKind.RawLang, this.s);
    }

    const lines = splitNewlines(this.s.to(innerEnd));

    let minDedent: number | null = null;
    const computeDedent = (line: string) => {
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        if (/^\s$/.test(line[i]!)) count++;
        else break;
      }
      return count;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^\s*$/.test(line)) continue;
      const dedent = computeDedent(line);
      if (minDedent === null || dedent < minDedent) minDedent = dedent;
    }
    const last = lines[lines.length - 1]!;
    const lastDedent = computeDedent(last);
    if (minDedent === null || lastDedent < minDedent) minDedent = lastDedent;

    const dedent = minDedent || 0;

    if (lines.length > 0 && /^\s*$/.test(lines[lines.length - 1]!)) {
      lines.pop();
    } else if (lines.length > 0) {
      let lastLine = lines[lines.length - 1]!;
      if (lastLine.endsWith('`')) {
        if (lastLine.endsWith(' `')) {
          lastLine = lastLine.slice(0, -2) + '`';
        }
        lines[lines.length - 1] = lastLine;
      }
    }

    if (lines.length > 0) {
      const firstLine = lines.shift()!;
      if (/^\s*$/.test(firstLine)) {
        this.s.advance(firstLine.length);
      } else {
        const lineEnd = this.s.cursor + firstLine.length;
        if (this.s.eatIf(' ')) {
          pushRaw(SyntaxKind.RawTrimmed, this.s);
        }
        this.s.jump(lineEnd);
        pushRaw(SyntaxKind.Text, this.s);
      }
    }

    for (const line of lines) {
      let offset = 0;
      let count = 0;
      for (const char of line) {
        if (count >= dedent) break;
        offset += char.length;
        count++;
      }
      this.eatNewline();
      this.s.advance(offset);
      pushRaw(SyntaxKind.RawTrimmed, this.s);
      this.s.advance(line.length - offset);
      pushRaw(SyntaxKind.Text, this.s);
    }

    if (this.s.cursor < innerEnd) {
      this.s.jump(innerEnd);
      pushRaw(SyntaxKind.RawTrimmed, this.s);
    }
  }

  private inlineRaw(innerEnd: number, pushRaw: (kind: SyntaxKind, s: Scanner) => void) {
    while (this.s.cursor < innerEnd) {
      if (this.s.at(isNewline)) {
        pushRaw(SyntaxKind.Text, this.s);
        this.eatNewline();
        pushRaw(SyntaxKind.RawTrimmed, this.s);
        continue;
      }
      this.s.eat();
    }
    pushRaw(SyntaxKind.Text, this.s);
  }

  private link(): SyntaxKind {
    const [link, balanced] = linkPrefix(this.s.after());
    this.s.advance(link.length);

    if (!balanced)
      return this.error('automatic links cannot contain unbalanced brackets, use the `link` function instead');

    return SyntaxKind.Link;
  }

  private numbering(start: number): SyntaxKind {
    this.s.eatWhile((ch) => /^[0-9]$/.test(ch));

    const read = this.s.from(start);
    // TODO: str.parse::<u64>
    if (this.s.eatIf('.') && this.spaceOrEnd() && !Number.isNaN(Number(read))) return SyntaxKind.EnumMarker;

    return this.text();
  }

  private refMarker(): SyntaxKind {
    this.s.eatWhile(isValidInLabelLiteral);

    while (true) {
      const last = this.s.scout(-1);
      if (last === '.' || last === ':') this.s.uneat();
      else break;
    }

    return SyntaxKind.RefMarker;
  }

  private label(): SyntaxKind {
    const labelStr = this.s.eatWhile(isValidInLabelLiteral);
    if (labelStr.length === 0) return this.error('label cannot be empty');

    if (!this.s.eatIf('>')) return this.error('unclosed label');

    return SyntaxKind.Label;
  }

  // TODO: text
  private text(): SyntaxKind {
    const table = new Set([
      ' ',
      '\t',
      '\n',
      '\x0B',
      '\x0C',
      '\r',
      '\\',
      '/',
      '[',
      ']',
      '~',
      '-',
      '.',
      "'",
      '"',
      '*',
      '_',
      ':',
      'h',
      '`',
      '$',
      '<',
      '>',
      '@',
      '#',
    ]);

    while (true) {
      this.s.eatUntil((c) => table.has(c) || isWhiteSpace(c));

      const s = new Scanner(this.s.string);
      s.jump(this.s.cursor);

      const ch = s.eat();
      let shouldContinue = false;
      if (ch === ' ' && s.at((c) => /^[\p{L}\p{N}]$/u.test(c))) shouldContinue = true;
      else if (ch === '/' && !s.at(['/', '*'])) shouldContinue = true;
      else if (ch === '-' && !s.at(['-', '?'])) shouldContinue = true;
      else if (ch === '.' && !s.at('..')) shouldContinue = true;
      else if (ch === 'h' && !s.at('ttp://') && !s.at('ttps://')) shouldContinue = true;
      else if (ch === '@' && !s.at(isValidInLabelLiteral)) shouldContinue = true;

      if (shouldContinue) this.s.jump(s.cursor);
      else break;
    }

    return SyntaxKind.Text;
  }

  private inWord(): boolean {
    const wordy = (c: string) => {
      if (!c) return false;
      return (
        isAlphaNumericRegexMatched(c) &&
        !isHanRegexMatched(c) &&
        !isHiraganaRegexMatched(c) &&
        !isKatakanaRegexMatched(c) &&
        !isHangulRegexMatched(c)
      );
    };
    const prev = this.s.scout(-2);
    const next = this.s.peek();
    return wordy(prev) && wordy(next);
  }

  private spaceOrEnd(): boolean {
    return this.s.done() || this.s.at((ch) => /^\s$/.test(ch)) || this.s.at('//') || this.s.at('/*');
  }

  private math(start: number, c: string): [SyntaxKind, SyntaxNode | null] {
    let kind: SyntaxKind;

    if (c === '\\') kind = this.backslash();
    else if (c === '"') kind = this.string_();
    else if (c === '-' && (this.s.eatIf('>>') || this.s.eatIf('>') || this.s.eatIf('->')))
      kind = SyntaxKind.MathShorthand;
    else if (c === ':' && (this.s.eatIf('=') || this.s.eatIf(':='))) kind = SyntaxKind.MathShorthand;
    else if (c === '!' && this.s.eatIf('=')) kind = SyntaxKind.MathShorthand;
    else if (c === '.' && this.s.eatIf('..')) kind = SyntaxKind.MathShorthand;
    else if (c === '[' && this.s.eatIf('|')) kind = SyntaxKind.MathShorthand;
    else if (
      c === '<' &&
      (this.s.eatIf('==>') ||
        this.s.eatIf('-->') ||
        this.s.eatIf('--') ||
        this.s.eatIf('-<') ||
        this.s.eatIf('->') ||
        this.s.eatIf('<-') ||
        this.s.eatIf('<<') ||
        this.s.eatIf('=>') ||
        this.s.eatIf('==') ||
        this.s.eatIf('~~') ||
        this.s.eatIf('=') ||
        this.s.eatIf('<') ||
        this.s.eatIf('-') ||
        this.s.eatIf('~'))
    )
      kind = SyntaxKind.MathShorthand;
    else if (c === '>' && (this.s.eatIf('->') || this.s.eatIf('>>'))) kind = SyntaxKind.MathShorthand;
    else if (c === '=' && (this.s.eatIf('=>') || this.s.eatIf('>') || this.s.eatIf(':')))
      kind = SyntaxKind.MathShorthand;
    else if (c === '>' && (this.s.eatIf('=') || this.s.eatIf('>'))) kind = SyntaxKind.MathShorthand;
    else if (c === '|' && (this.s.eatIf('->') || this.s.eatIf('=>') || this.s.eatIf(']') || this.s.eatIf('|')))
      kind = SyntaxKind.MathShorthand;
    else if (c === '~' && (this.s.eatIf('~>') || this.s.eatIf('>'))) kind = SyntaxKind.MathShorthand;
    else if (c === '*' || c === '-' || c === '~') kind = SyntaxKind.MathShorthand;
    else if (c === '.') kind = SyntaxKind.Dot;
    else if (c === ',') kind = SyntaxKind.Comma;
    else if (c === ';') kind = SyntaxKind.Semicolon;
    else if (c === ')') kind = SyntaxKind.RightParen;
    else if (c === '#') kind = SyntaxKind.Hash;
    else if (c === '_') kind = SyntaxKind.Underscore;
    else if (c === '$') kind = SyntaxKind.Dollar;
    else if (c === '/') kind = SyntaxKind.Slash;
    else if (c === '^') kind = SyntaxKind.Hat;
    else if (c === "'") kind = SyntaxKind.Prime;
    else if (c === '&') kind = SyntaxKind.MathAlignPoint;
    else if (c === '√' || c === '∛' || c === '∜') kind = SyntaxKind.Root;
    else if (isMathIdStart(c) && this.s.at(isMathIdContinue)) {
      this.s.eatWhile(isMathIdContinue);
      const [k, node] = this.mathIdentOrField(start);
      return [k, node];
    } else kind = this.mathText(start, c);

    return [kind, null];
  }

  private mathIdentOrField(start: number): [SyntaxKind, SyntaxNode] {
    let kind = SyntaxKind.MathIdent;
    let node = SyntaxNode.leaf(kind, this.s.from(start));
    let ident = this.maybeDotIdent();
    while (ident !== null) {
      kind = SyntaxKind.FieldAccess;
      const fieldChildren = [node, SyntaxNode.leaf(SyntaxKind.Dot, '.'), SyntaxNode.leaf(SyntaxKind.Ident, ident)];
      node = SyntaxNode.inner(kind, fieldChildren);
      ident = this.maybeDotIdent();
    }
    return [kind, node];
  }

  private maybeDotIdent(): string | null {
    if (this.s.scout(1) !== '' && isMathIdStart(this.s.scout(1)) && this.s.eatIf('.')) {
      const identStart = this.s.cursor;
      this.s.eat();
      this.s.eatWhile(isMathIdContinue);
      return this.s.from(identStart);
    }
    return null;
  }

  private mathText(start: number, c: string): SyntaxKind {
    if (isNumeric(c)) {
      this.s.eatWhile(isNumeric);
      const s = new Scanner(this.s.string);
      s.jump(this.s.cursor);
      if (s.eatIf('.') && s.eatWhile(isNumeric).length !== 0) this.s.jump(s.cursor);
      return SyntaxKind.MathText;
    } else {
      // TODO: grapheme cluster
      const charCode = c.charCodeAt(0);
      let len = 1;
      if (charCode >= 0xd800 && charCode <= 0xdbff)
        if (this.s.scout(1).charCodeAt(0) >= 0xdc00 && this.s.scout(1).charCodeAt(0) <= 0xdfff) len = 2;
      this.s.jump(start + len);

      return SyntaxKind.MathText;
    }
  }

  public maybeMathNamedArg(start: number): SyntaxNode | null {
    const cursor = this.s.cursor;
    this.s.jump(start);
    if (this.s.eatIf(isIdStart)) {
      this.s.eatWhile(isIdContinue);
      const atColon = this.s.at(':');
      const atColonEq = this.s.at(':=');
      const atColonColonEq = this.s.at('::=');
      if (atColon && !atColonEq && !atColonColonEq) {
        let node: SyntaxNode;
        if (this.s.from(start) !== '_') node = SyntaxNode.leaf(SyntaxKind.Ident, this.s.from(start));
        else {
          const msg = SyntaxErrorNode.new('expected identifier, found underscore');
          node = SyntaxNode.error(msg, this.s.from(start));
        }
        return node;
      }
    }
    this.s.jump(cursor);
    return null;
  }

  public maybeMathSpreadArg(start: number): SyntaxNode | null {
    const cursor = this.s.cursor;
    this.s.jump(start);
    if (this.s.eatIf('..'))
      if (!this.spaceOrEnd() && !this.s.at('.')) return SyntaxNode.leaf(SyntaxKind.Dots, this.s.from(start));
    this.s.jump(cursor);
    return null;
  }

  private code(start: number, c: string): SyntaxKind {
    switch (c) {
      case '<':
        if (this.s.at(isIdContinue)) return this.label();
        if (this.s.eatIf('=')) return SyntaxKind.LtEq;
        return SyntaxKind.Lt;
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
      case '.':
        if (this.s.at((ch) => /^[0-9]$/.test(ch))) return this.number(start, c); // TODO
        if (this.s.eatIf('.')) return SyntaxKind.Dots;
        return SyntaxKind.Dot;
      case '"':
        return this.string_();
      case '=':
        if (this.s.eatIf('=')) return SyntaxKind.EqEq;
        if (this.s.eatIf('>')) return SyntaxKind.Arrow;
        return SyntaxKind.Eq;
      case '!':
        if (this.s.eatIf('=')) return SyntaxKind.ExclEq;
        return this.error(`the character \`!\` is not valid in code`);
      case '>':
        if (this.s.eatIf('=')) return SyntaxKind.GtEq;
        return SyntaxKind.Gt;
      case '+':
        if (this.s.eatIf('=')) return SyntaxKind.PlusEq;
        return SyntaxKind.Plus;
      case '-':
      case '\u2212':
        if (this.s.eatIf('=')) return SyntaxKind.HyphEq;
        return SyntaxKind.Minus;
      case '*':
        if (this.s.eatIf('=')) return SyntaxKind.StarEq;
        return SyntaxKind.Star;
      case '/':
        if (this.s.eatIf('=')) return SyntaxKind.SlashEq;
        return SyntaxKind.Slash;

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

      default:
        if (isIdStart(c)) return this.ident(start);
        return this.error(`the character \`${c}\` is not valid in code`);
    }
  }

  private ident(start: number): SyntaxKind {
    this.s.eatWhile(isIdContinue);
    const identStr = this.s.from(start);

    const prev = this.s.get(0, start);
    if (!((prev.endsWith('.') || prev.endsWith('@')) && !prev.endsWith('..'))) {
      const kw = keyword(identStr);
      if (kw !== undefined) return kw;
    }

    if (identStr === '_') return SyntaxKind.Underscore;
    return SyntaxKind.Ident;
  }

  private number(start: number, firstC: string): SyntaxKind {
    let base = 10;
    if (firstC === '0') {
      if (this.s.eatIf('b')) base = 2;
      else if (this.s.eatIf('o')) base = 8;
      else if (this.s.eatIf('x')) base = 16;
    }

    // TODO
    if (base === 16) this.s.eatWhile((ch) => /^[0-9a-zA-Z]$/.test(ch));
    else this.s.eatWhile((ch) => /^[0-9]$/.test(ch));

    let isFloat = false;
    if (base === 10) {
      if (firstC === '.') isFloat = true;
      else if (!this.s.at('..') && !isIdStart(this.s.scout(1)) && this.s.eatIf('.')) {
        isFloat = true;
        this.s.eatWhile((ch) => /^[0-9]$/.test(ch));
      }

      // TODO:
      if (!this.s.at('em') && (this.s.eatIf('e') || this.s.eatIf('E'))) {
        isFloat = true;
        this.s.eatIf('+') || this.s.eatIf('-');
        this.s.eatWhile((ch) => /^[0-9]$/.test(ch));
      }
    }

    const numberStr = this.s.from(start);
    // TODO
    const suffix = this.s.eatWhile((ch) => /^[a-zA-Z0-9]$/.test(ch) || ch === '%');

    if (base === 10 && !isFloat) {
      const num = parseInt(numberStr, 10);
      if (num >= Number.MAX_SAFE_INTEGER || num <= Number.MIN_SAFE_INTEGER)
        if (!Number.isNaN(parseFloat(numberStr))) isFloat = true;
    }

    let suffixResult: string | null = null;
    let suffixOk = false;
    if (suffix === '') suffixOk = true;
    else if (['pt', 'mm', 'cm', 'in', 'deg', 'rad', 'em', 'fr', '%'].includes(suffix)) {
      suffixOk = true;
      suffixResult = 'suffix';
    } else suffixResult = `invalid number suffix: ${suffix}`;

    let numberResultOk = false;
    let numberResultErr: string | null = null;

    if (isFloat && Number.isNaN(parseFloat(numberStr))) numberResultErr = `invalid floating point number: ${numberStr}`;
    else if (base === 10) numberResultOk = true;
    else {
      let name = '';
      if (base === 2) name = 'binary';
      else if (base === 8) name = 'octal';
      else if (base === 16) name = 'hexadecimal';

      // TODO
      const numStrBase = numberStr.slice(2);
      let isValidBaseInt = false;
      if (base === 2) isValidBaseInt = /^[01]+$/.test(numStrBase);
      else if (base === 8) isValidBaseInt = /^[0-7]+$/.test(numStrBase);
      else if (base === 16) isValidBaseInt = /^[0-9a-fA-F]+$/.test(numStrBase);

      if (isValidBaseInt && suffix === '') numberResultOk = true;
      else if (isValidBaseInt) {
        if (suffixOk) {
          suffixResult = `try using a decimal number: ${parseInt(numStrBase, base)}${suffix}`;
          suffixOk = false;
        }
        numberResultErr = `${name} numbers cannot have a suffix`;
      } else numberResultErr = `invalid ${name} number: ${numberStr}`;
    }

    if (numberResultOk && suffixOk && !suffixResult) {
      if (isFloat) return SyntaxKind.Float;
      return SyntaxKind.Int;
    } else if (numberResultOk && suffixOk && suffixResult === 'suffix') return SyntaxKind.Numeric;
    else if (!numberResultOk && !suffixOk) {
      const err = this.error(numberResultErr!);
      this.hint(suffixResult!);
      return err;
    } else if (numberResultOk && !suffixOk) return this.error(suffixResult!);
    else return this.error(numberResultErr!);
  }

  private string_(): SyntaxKind {
    let escaped = false;
    this.s.eatUntil((c) => {
      const stop = c === '"' && !escaped;
      escaped = c === '\\' && !escaped;
      return stop;
    });

    if (!this.s.eatIf('"')) return this.error('unclosed string');

    return SyntaxKind.Str;
  }

  // Scanner

  private eatNewline(): boolean {
    const ate = this.s.eatIf(isNewline);
    if (ate && this.s.before().endsWith('\r')) this.s.eatIf('\n');
    return ate;
  }
}

function keyword(ident: string): SyntaxKind | undefined {
  switch (ident) {
    case 'none':
      return SyntaxKind.None;
    case 'auto':
      return SyntaxKind.Auto;
    case 'true':
      return SyntaxKind.Bool;
    case 'false':
      return SyntaxKind.Bool;
    case 'not':
      return SyntaxKind.Not;
    case 'and':
      return SyntaxKind.And;
    case 'or':
      return SyntaxKind.Or;
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
    default:
      return undefined;
  }
}

function isSpace(c: string, mode: SyntaxMode): boolean {
  switch (mode) {
    case SyntaxMode.Markup:
      return c === ' ' || c === '\t' || isNewline(c);
    default:
      return isWhiteSpace(c);
  }
}

export function isNewline(c: string): boolean {
  return c === '\n' || c === '\x0B' || c === '\x0C' || c === '\r' || c === '\u0085' || c === '\u2028' || c === '\u2029';
}

export function linkPrefix(text: string): [string, boolean] {
  const s = new Scanner(text);
  const brackets: string[] = [];

  s.eatWhile((c) => {
    if (/^[0-9a-zA-Z!#$%&*+,-./:;=?@_~']$/.test(c)) return true;
    if (c === '[') {
      brackets.push('[');
      return true;
    }
    if (c === '(') {
      brackets.push('(');
      return true;
    }
    if (c === ']') return brackets.pop() === '[';
    if (c === ')') return brackets.pop() === '(';
    return false;
  });

  while (true) {
    const last = s.scout(-1);
    if (last === '!' || last === ',' || last === '.' || last === ':' || last === ';' || last === '?' || last === "'")
      s.uneat();
    else break;
  }

  return [s.before(), brackets.length === 0];
}

export function splitNewlines(text: string): string[] {
  const s = new Scanner(text);
  const lines: string[] = [];
  let start = 0;
  let end = 0;

  while (!s.done()) {
    const c = s.eat();
    if (c === null) break;
    if (isNewline(c)) {
      if (c === '\r') s.eatIf('\n');

      lines.push(text.slice(start, end));
      start = s.cursor;
    }
    end = s.cursor;
  }

  lines.push(text.slice(start));
  return lines;
}

function countNewlines(text: string): number {
  let newlines = 0;
  const s = new Scanner(text);
  while (!s.done()) {
    const c = s.eat();
    if (c === null) break;
    if (isNewline(c)) {
      if (c === '\r') s.eatIf('\n');
      newlines++;
    }
  }
  return newlines;
}

export function isIdent(text: string): boolean {
  const iterator = text[Symbol.iterator]();
  const first = iterator.next();
  if (first.done) return false;
  if (!isIdStart(first.value)) return false;

  for (const ch of iterator) if (!isIdContinue(ch)) return false;
  return true;
}

export function isIdStart(c: string): boolean {
  return isXidStart(c) || c === '_';
}

export function isIdContinue(c: string): boolean {
  return isXidContinue(c) || c === '_' || c === '-';
}

function isMathIdStart(c: string): boolean {
  return isXidStart(c);
}

function isMathIdContinue(c: string): boolean {
  return isXidContinue(c) && c !== '_';
}

function isValidInLabelLiteral(c: string): boolean {
  return isIdContinue(c) || c === ':' || c === '.';
}

export function isValidLabelLiteralId(id: string): boolean {
  if (id.length === 0) return false;
  for (const c of id) if (!isValidInLabelLiteral(c)) return false;
  return true;
}
