/** biome-ignore-all lint/suspicious/noFallthroughSwitchClause: 元の実装に合わせるため */

import { isWhiteSpace } from '../std/char';
import { parseU64IsOk } from '../std/str';
import { defaultMathClass } from '../typst-utils';
import { MathClass } from '../unicode-math-class';
import { Scanner } from '../unscanny';
// biome-ignore lint/suspicious/noShadowRestrictedNames: 他との名前を揃えるため
import { type SyntaxError, SyntaxKind, SyntaxMode, type SyntaxNode, type SyntaxToken } from '.';

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

const isValidInLabelLiteral = (c: string) => isIdContinue(c) || c === '.' || c === ':';

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

export class Lexer {
  s: Scanner;
  mode: SyntaxMode;
  newline: boolean = false;
  error: SyntaxError | null = null;

  atLineStart: boolean = true;

  constructor(text: string, mode: SyntaxMode = SyntaxMode.Markup) {
    this.s = new Scanner(text);
    this.mode = mode;
  }

  tokenize(): SyntaxToken[] {
    const tokens: SyntaxToken[] = [];

    while (!this.s.done()) {
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

  next(): SyntaxNode {
    const start = this.s.cursor;

    this.newline = false;
    let kind: SyntaxKind;
    const c = this.s.eat();
    if (!c) kind = SyntaxKind.End;
    else if (isSpace(c, this.mode)) kind = this.whitespace(start, c);
    else if (c === '#' && start === 0 && this.s.eatIf('!')) kind = this.shebang();
    else if (c === '/' && this.s.eatIf('/')) kind = this.lineComment();
    else if (c === '/' && this.s.eatIf('*')) kind = this.blockComment();
    else if (c === '*' && this.s.eatIf('/')) kind = this.makeError('unexpected end of block comment');
    else if (c === '`' && this.mode !== SyntaxMode.Math) {
      this.atLineStart = false;
      return this.raw();
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

  private whitespace(start: number, c: string): SyntaxKind {
    const more = this.s.eatWhile((x) => isSpace(x, this.mode));

    let newlines = 0;
    if (c !== ' ' && more !== '') newlines = countNewlines(this.s.from(start));

    this.newline = newlines > 0;
    if (newlines > 0) this.atLineStart = true; // TODO

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

    while (true) {
      const c = this.s.eat();
      if (!c) break;

      if (state === '*' && c === '/') {
        depth--;
        state = '_';
        if (depth === 0) break;
      } else if (state === '*' && c === '*') {
        depth++;
        state = '_';
      } else state = c;
    }

    return SyntaxKind.BlockComment;
  }

  private markup(start: number, c: string): SyntaxKind {
    if (c === '\\') return this.backslash();
    if (c === 'h' && (this.s.eatIf('ttp://') || this.s.eatIf('ttps://'))) return this.link();
    if (c === '<' && isIdStart(this.s.peek())) return this.label();
    if (c === '@' && isIdStart(this.s.peek())) return this.refMarker();

    if (c === '.' && this.s.eatIf('.')) return SyntaxKind.Shorthand;
    if (c === '-' && (this.s.eatIf('--') || this.s.eatIf('-') || this.s.eatIf('?') || isNumeric(this.s.peek())))
      return SyntaxKind.Shorthand;
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
      this.s.eatWhile((x) => x === '=');
      return this.spaceOrEnd() ? SyntaxKind.HeadingMarker : this.text();
    }
    if (c === '-' && this.spaceOrEnd()) return SyntaxKind.ListMarker;
    if (c === '+' && this.spaceOrEnd()) return SyntaxKind.EnumMarker;
    if (c === '/' && this.spaceOrEnd()) return SyntaxKind.TermMarker;

    if (
      c === '0' ||
      c === '1' ||
      c === '2' ||
      c === '3' ||
      c === '4' ||
      c === '5' ||
      c === '6' ||
      c === '7' ||
      c === '8' ||
      c === '9'
    )
      return this.numbering(start);

    return this.text();
  }

  private backslash(): SyntaxKind {
    if (this.s.eatIf('u{')) {
      this.s.eatWhile((x) => /[0-9a-fA-F]/.test(x)); // TODO
      if (!this.s.eatIf('}')) return this.makeError('unclosed Unicode escape sequence');

      return SyntaxKind.Escape;
    }

    if (this.s.done() || this.s.at(isWhiteSpace)) return SyntaxKind.Linebreak;
    else {
      this.s.eat();
      return SyntaxKind.Escape;
    }
  }

  private raw(): SyntaxNode {
    const start = this.s.cursor - 1;

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
    while (found < backticks) {
      const c = this.s.eat();
      if (c === '`') found += 1;
      else if (c !== null) found = 0;
      else return this.leaf(SyntaxKind.Error, start);
    }

    // TODO

    return this.leaf(SyntaxKind.Raw, start);
  }

  private link(): SyntaxKind {
    const [link, balanced] = link_prefix(this.s.after());
    this.s.advance(link.length);

    if (!balanced)
      return this.makeError('automatic links cannot contain unbalanced brackets, use the `link` function instead');

    return SyntaxKind.Link;
  }

  private numbering(start: number): SyntaxKind {
    this.s.eatWhile(isNumeric); // TODO

    const read = this.s.from(start);
    if (this.s.eatIf('.') && this.spaceOrEnd() && parseU64IsOk(read)) return SyntaxKind.EnumMarker;

    return this.text();
  }

  private refMarker(): SyntaxKind {
    this.s.eatWhile(isValidInLabelLiteral);

    while (true) {
      const c = this.s.scout(-1);
      if (c === '.' || c === ':') this.s.uneat();
      else break;
    }

    return SyntaxKind.RefMarker;
  }

  private label(): SyntaxKind {
    const label = this.s.eatWhile(isValidInLabelLiteral);
    if (label === '') return this.makeError('label cannot be empty');

    if (!this.s.eatIf('>')) return this.makeError('unclosed label');

    return SyntaxKind.Label;
  }

  // TODO
  private text(): SyntaxKind {
    const special = /^[ \t\n\u000b\u000c\r\\/[\]~\-.'"*_:h`$<>@#]/;
    this.s.eatUntil((c) => special.test(c));
    return SyntaxKind.Text;
  }

  // TODO
  private inWord(): boolean {
    const p = this.s.string[this.s.cursor - 2];
    const n = this.s.peek();
    const isAlphanumeric = (x: string | undefined) => x && /[a-zA-Z0-9]/.test(x);
    return !!(isAlphanumeric(p) && isAlphanumeric(n));
  }

  private spaceOrEnd(): boolean {
    return this.s.done() || this.s.at(isWhiteSpace) || this.s.at('//') || this.s.at('/*');
  }

  private math(start: number, c: string): [SyntaxKind, SyntaxNode?] {
    if (c === '\\') return [this.backslash()];
    if (c === '"') return [this.string(start)];

    if (c === '-') {
      if (this.s.eatIf('>>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('->')) return [SyntaxKind.MathShorthand];
    }
    else if (c === ':') {
      if (this.s.eatIf('=')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf(':=')) return [SyntaxKind.MathShorthand];
    }
    else if (c === '!') {
      if (this.s.eatIf('=')) return [SyntaxKind.MathShorthand];
    }
    else if (c === '.') {
      if (this.s.eatIf('..')) return [SyntaxKind.MathShorthand];
    }
    else if (c === '<') {
      if (this.s.eatIf('==>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('-->')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('--')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('-<')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('->')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('<-')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('<<')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('=>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('==')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('~~')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('=')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('<')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('-')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('~')) return [SyntaxKind.MathShorthand];
    }
    else if (c === '>') {
      if (this.s.eatIf("->")) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf(">>")) return [SyntaxKind.MathShorthand];
    }
    else if (c === '=') {
      if (this.s.eatIf("=>")) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf(':')) return [SyntaxKind.MathShorthand];
    }
    if (c === '>') {
      if (this.s.eatIf("=")) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf(">")) return [SyntaxKind.MathShorthand];
    }
    else if (c === '|') {
      if (this.s.eatIf('->')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('=>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('|')) return [SyntaxKind.MathShorthand];
    }
    else if (c === '~') {
      if (this.s.eatIf('~>')) return [SyntaxKind.MathShorthand];
      if (this.s.eatIf('>')) return [SyntaxKind.MathShorthand];
    }
    else if (c === '*' || c === '-' || c === '~') return [SyntaxKind.MathShorthand];

    else if (c === '.') return [SyntaxKind.Dot];
    else if (c === ',') return [SyntaxKind.Comma];
    else if (c === ';') return [SyntaxKind.Semicolon];

    else if (c === '#') return [SyntaxKind.Hash];
    else if (c === '_') return [SyntaxKind.Underscore];
    else if (c === '$') return [SyntaxKind.Dollar];
    else if (c === '/') return [SyntaxKind.Slash];
    else if (c === '^') return [SyntaxKind.Hat];
    else if (c === '&') return [SyntaxKind.MathAlignPoint];
    else if (c === '√' || c === '∛' || c === '∜') return [SyntaxKind.Root];
    else if (c === '!') return [SyntaxKind.Bang];

    else if (c === "'") {
      this.s.eatWhile("'");
      return [SyntaxKind.MathPrimes];
    }

    else if (c === "(") return [SyntaxKind.LeftParen];
    else if (c === ")") return [SyntaxKind.RightParen];
    else if (c === "[") {
      if (this.s.eatIf("|")) return [SyntaxKind.LeftBrace];
    }
    if (c === "|") {
      if (this.s.eatIf("]")) return [SyntaxKind.RightBrace];
    }
    if (defaultMathClass(c) === MathClass.Opening) return [SyntaxKind.LeftBrace];
    if (defaultMathClass(c) === MathClass.Closing) return [SyntaxKind.RightBrace];

    if (isMathIdStart(c) && this.s.at(isMathIdContinue)) {
      this.s.eatWhile(isMathIdContinue);
      const [last_index, _] = this.s.from(start).graphemeIndices(true);
      if (last_index === 0) return [SyntaxKind.MathText];
      else return this.mathIdentOrField(start);
    }

    return this.MathText(start, c);
  }

  private mathIdentOrField(start: number): [SyntaxKind, SyntaxNode] {
    let kind = SyntaxKind.MathIdent;
    let node = SyntaxNode.leaf(kind, this.s.from(start));
    while (this.maybeDotIdent()) {
      kind = SyntaxKind.FieldAccess;
      const fieldChildren = [
                node,
                SyntaxNode.leaf(SyntaxKind.Dot, '.'),
                SyntaxNode.leaf(SyntaxKind.Ident, this.s.from(start)),
            ];
      node = SyntaxNode.inner(kind, fieldChildren);
      }
    return [kind, node];
  }

  private maybeDotIdent(): string | undefined {
    if (this.s.scout(1).is_some_and(isMathIdStart) && this.s.eatIf('.')) {
      const identStart = this.s.cursor;
      this.s.eat();
      this.s.eatWhile(isMathIdContinue);
      return this.s.from(identStart);
    }
    return undefined;
  }

  private mathText(start: number, c: string): SyntaxKind {
      if c.is_numeric() {
          this.s.eatWhile(char::is_numeric);
          let mut s = this.s;
          if s.eatIf('.') && !s.eatWhile(char::is_numeric).is_empty() {
              this.s = s;
          }
      } else {
          const len = this
              .s
              .get(start..this.s.string().len())
              .graphemeIndices(true)
              .next()
              .map_or(0, str::len);
          this.s.jump(start + len);
      }
      return SyntaxKind.MathText;
  }

  private maybeMathNamedArg(start: number): SyntaxNode | undefined {
        const cursor = this.s.cursor;
        this.s.jump(start);
        if this.s.eatIf(is_id_start) {
            this.s.eat_while(is_id_continue);
            if this.s.at(':') && !this.s.at(":=") && !this.s.at("::=") {
                const node = if this.s.from(start) != "_" {
                    SyntaxNode::leaf(SyntaxKind::Ident, this.s.from(start))
                } else {
                    const msg = SyntaxError::new("expected identifier, found underscore");
                    SyntaxNode::error(msg, self.s.from(start))
                };
                return Some(node);
            }
        }
        this.s.jump(cursor);
    }

    private maybeMathSpreadArg(start: number): SyntaxNode | undefined {
        const cursor = this.s.cursor;
        this.s.jump(start);
        if this.s.eatIf("..") {
            if !this.space_or_end() && !this.s.at(['.', ',', ';', ')', '$']) {
                const node = SyntaxNode::leaf(SyntaxKind::Dots, this.s.from(start));
                return Some(node);
            }
        } 
        this.s.jump(cursor);
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

  private number(_start: number, _c: string): SyntaxKind 
    this.s.eatWhile((x) => /[0-9a-zA-Z_.%]/.test(x));
    return SyntaxKind.Numeric;

  private string(start: number): SyntaxNode 
    this.stringKind(start);
    return this.leaf(SyntaxKind.Str, start);

  private stringKind(_start: number): SyntaxKind 
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

  private manualLeaf(kind: SyntaxKind, from: number, to: number): SyntaxNode 
    return { kind, from, to, children: [] };

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

  private flatten(node: SyntaxNode, tokens: SyntaxToken[]) 
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

export function link_prefix(text: string): [string, boolean] {
  const s = new Scanner(text);
  const brackets: string[] = [];

  s.eatWhile((c: string) => {
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
      case 'a':
      case 'b':
      case 'c':
      case 'd':
      case 'e':
      case 'f':
      case 'g':
      case 'h':
      case 'i':
      case 'j':
      case 'k':
      case 'l':
      case 'm':
      case 'n':
      case 'o':
      case 'p':
      case 'q':
      case 'r':
      case 's':
      case 't':
      case 'u':
      case 'v':
      case 'w':
      case 'x':
      case 'y':
      case 'z':
      case 'A':
      case 'B':
      case 'C':
      case 'D':
      case 'E':
      case 'F':
      case 'G':
      case 'H':
      case 'I':
      case 'J':
      case 'K':
      case 'L':
      case 'M':
      case 'N':
      case 'O':
      case 'P':
      case 'Q':
      case 'R':
      case 'S':
      case 'T':
      case 'U':
      case 'V':
      case 'W':
      case 'X':
      case 'Y':
      case 'Z':
      case '!':
      case '#':
      case '$':
      case '%':
      case '&':
      case '*':
      case '+':
      case ',':
      case '-':
      case '.':
      case '/':
      case ':':
      case ';':
      case '=':
      case '?':
      case '@':
      case '_':
      case '~':
      case "'":
        return true;
      case '[':
        brackets.push('[');
        return true;
      case '(':
        brackets.push('(');
        return true;
      case ']':
        return brackets.pop() === '[';
      case ')':
        return brackets.pop() === '(';
      default:
        return false;
    }
  });

  loop: while (true) {
    const c = s.scout(-1);
    switch (c) {
      case '!':
      case ',':
      case '.':
      case ':':
      case ';':
      case '?':
      case "'":
        s.uneat();
        continue;
      default:
        break loop;
    }
  }

  return [s.before(), brackets.length === 0];
}
