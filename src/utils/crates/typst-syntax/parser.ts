import { MathClass } from '../unicode-math-class/classes';
import { class_ as mathClass } from '../unicode-math-class/index';
import { SyntaxMode } from '.';
import { SyntaxKind } from './kind';
import { Lexer } from './lexer';
import { InnerNode, LeafNode, SyntaxErrorNode, SyntaxNode } from './node';
import {
  ARG,
  ARRAY_OR_DICT_ITEM,
  ATOMIC_CODE_EXPR,
  BINARY_OP,
  CODE_EXPR,
  DESTRUCTURING_ITEM,
  MATH_EXPR,
  PARAM,
  PATTERN,
  PATTERN_LEAF,
  STMT,
  SyntaxSet,
  UNARY_OP,
} from './set';

export function parse(text: string): SyntaxNode {
  const p = new Parser(text, 0, SyntaxMode.Markup);
  p.markupExprs(true, SyntaxSet.create(SyntaxKind.End));
  return p.finishInto(SyntaxKind.Markup);
}

export function parseCode(text: string): SyntaxNode {
  const p = new Parser(text, 0, SyntaxMode.Code);
  p.codeExprs(SyntaxSet.create(SyntaxKind.End));
  return p.finishInto(SyntaxKind.Code);
}

export function parseMath(text: string): SyntaxNode {
  const p = new Parser(text, 0, SyntaxMode.Math);
  p.mathExprs(SyntaxSet.create(SyntaxKind.End));
  return p.finishInto(SyntaxKind.Math);
}

export function reparseMarkup(
  text: string,
  rangeStart: number,
  rangeEnd: number,
  atStart: { val: boolean },
  nesting: { val: number },
  topLevel: boolean,
): SyntaxNode[] | null {
  const p = new Parser(text, rangeStart, SyntaxMode.Markup);
  atStart.val = atStart.val || p.hadNewline();
  while (!p.end() && p.currentStart() < rangeEnd) {
    if (!topLevel && nesting.val === 0 && p.at(SyntaxKind.RightBracket)) break;
    nesting.val = p.markupExpr(atStart.val, nesting.val);
    atStart.val = p.hadNewline();
  }
  if (p.balanced && p.currentStart() === rangeEnd) return p.finish();
  return null;
}

export class Parser {
  public text: string;
  public lexer: Lexer;
  public nlMode: AtNewline;
  public token!: Token;
  public balanced: boolean = true;
  public nodes: SyntaxNode[] = [];
  public memo: MemoArena = new MemoArena();

  constructor(text: string, offset: number, mode: SyntaxMode) {
    this.lexer = new Lexer(text, mode);
    this.lexer.jump(offset);
    this.nlMode = AtNewline.Continue;
    this.token = Parser.lex(this.nodes, this.lexer, this.nlMode);

    this.text = text;
  }

  public finish(): SyntaxNode[] {
    return this.nodes;
  }

  public finishInto(kind: SyntaxKind): SyntaxNode {
    if (!this.at(SyntaxKind.End)) throw new Error('Expected End');
    return SyntaxNode.inner(kind, this.finish());
  }

  public current(): SyntaxKind {
    return this.token.kind;
  }

  public at(kind: SyntaxKind): boolean {
    return this.token.kind === kind;
  }

  public atSet(set: SyntaxSet): boolean {
    return SyntaxSet.contains(set, this.token.kind);
  }

  public end(): boolean {
    return this.at(SyntaxKind.End);
  }

  public directlyAt(kind: SyntaxKind): boolean {
    return this.token.kind === kind && !this.hadTrivia();
  }

  public hadTrivia(): boolean {
    return this.token.nTrivia > 0;
  }

  public hadNewline(): boolean {
    return this.token.newline !== null;
  }

  public currentColumn(): number {
    if (this.token.newline && this.token.newline.column !== null) return this.token.newline.column;
    return this.lexer.column(this.token.start);
  }

  public currentText(): string {
    return this.text.slice(this.token.start, this.currentEnd());
  }

  public currentStart(): number {
    return this.token.start;
  }

  public currentEnd(): number {
    return this.lexer.cursor();
  }

  public prevEnd(): number {
    return this.token.prevEnd;
  }

  // The main parsing interface for generating tokens and eating/modifying nodes.

  public marker(): Marker {
    return new Marker(this.nodes.length);
  }

  public beforeTrivia(): Marker {
    return new Marker(this.nodes.length - this.token.nTrivia);
  }

  public eatAndGet(): SyntaxNode {
    const offset = this.nodes.length;
    this.eat();
    return this.nodes[offset]!;
  }

  public eatIf(kind: SyntaxKind): boolean {
    const a = this.at(kind);
    if (a) this.eat();
    return a;
  }

  public eatIfDirect(kind: SyntaxKind): boolean {
    const a = this.directlyAt(kind);
    if (a) this.eat();
    return a;
  }

  public assert(kind: SyntaxKind) {
    if (this.token.kind !== kind) throw new Error(`Assert failed: expected ${kind}, got ${this.token.kind}`);
    this.eat();
  }

  public convertAndEat(kind: SyntaxKind) {
    this.token.node.convertToKind(kind);
    this.eat();
  }

  public eat() {
    // TODO
    this.nodes.push(this.token.node);
    this.token = Parser.lex(this.nodes, this.lexer, this.nlMode);
  }

  public flushTrivia() {
    this.token.nTrivia = 0;
    this.token.prevEnd = this.token.start;
  }

  public wrap(from: Marker, kind: SyntaxKind) {
    const to = this.beforeTrivia().index;
    const fromVal = Math.min(from.index, to);
    const children = this.nodes.splice(fromVal, to - fromVal);
    this.nodes.splice(fromVal, 0, SyntaxNode.inner(kind, children));
  }

  public enterModes(mode: SyntaxMode, stop: AtNewline, func: (p: Parser) => void) {
    const previous = this.lexer.mode;
    this.lexer.setMode(mode);
    this.withNlMode(stop, func);
    if (mode !== previous) {
      this.lexer.setMode(previous);
      this.lexer.jump(this.token.prevEnd);
      this.nodes.splice(this.nodes.length - this.token.nTrivia, this.token.nTrivia);
      this.token = Parser.lex(this.nodes, this.lexer, this.nlMode);
    }
  }

  public withNlMode(mode: AtNewline, func: (p: Parser) => void) {
    const previous = this.nlMode;
    this.nlMode = mode;
    func(this);
    this.nlMode = previous;
    if (this.token.newline && mode !== previous) {
      const actualKind = this.token.node.kind();
      if (this.nlMode.stopAt(this.token.newline, actualKind)) this.token.kind = SyntaxKind.End;
      else this.token.kind = actualKind;
    }
  }

  // TODO
  public static lex(nodes: SyntaxNode[], lexer: Lexer, nlMode: AtNewline): Token {
    const prevEnd = lexer.cursor();
    let nTrivia = 0;
    let newline: Newline | null = null;

    while (true) {
      const start = lexer.cursor();
      const [kind, node] = lexer.next();

      if (SyntaxKind.isTrivia(kind)) {
        nTrivia += 1;
        nodes.push(node);
        if (lexer.newline) {
          const current: Newline = {
            column: lexer.mode === SyntaxMode.Markup ? lexer.column(start) : null,
            parbreak: kind === SyntaxKind.Parbreak,
          };
          if (newline)
            newline = {
              column: newline.column ?? current.column,
              parbreak: newline.parbreak || current.parbreak,
            };
          else newline = current;
        }
        continue;
      }

      if (newline && nlMode.stopAt(newline, kind))
        return new Token(SyntaxKind.End, node, nTrivia, newline, start, prevEnd);

      return new Token(kind, node, nTrivia, newline, start, prevEnd);
    }
  }

  /// The Memoization interface.

  public memoizeParsedNodes(key: number, prevLen: number) {
    const cp = this.checkpoint();
    const memoStart = this.memo.arena.length;
    for (let i = prevLen; i < cp.nodeLen; i++) this.memo.arena.push(this.nodes[i]!.clone());
    const memoEnd = this.memo.arena.length;
    this.memo.memoMap.set(key, [memoStart, memoEnd, cp.state.clone()]);
  }

  public restoreMemoOrCheckpoint(): [number, Checkpoint] | null {
    const key = this.currentStart();
    const entry = this.memo.memoMap.get(key);
    if (entry !== undefined) {
      const [start, end, state] = entry;
      for (let i = start; i < end; i++) this.nodes.push(this.memo.arena[i]!.clone());
      this.restorePartial(state.clone());
      return null;
    } else return [key, this.checkpoint()];
  }

  public restore(checkpoint: Checkpoint) {
    this.nodes.splice(checkpoint.nodeLen, this.nodes.length - checkpoint.nodeLen);
    this.restorePartial(checkpoint.state);
  }

  public restorePartial(state: PartialState) {
    this.lexer.jump(state.cursor);
    this.lexer.setMode(state.lexMode);
    this.token = state.token;
  }

  public checkpoint(): Checkpoint {
    const nodeLen = this.nodes.length;
    const state = new PartialState(this.lexer.cursor(), this.lexer.mode, this.token.clone());
    return new Checkpoint(nodeLen, state);
  }

  // TODO
  public expect(kind: SyntaxKind): boolean {
    const at = this.at(kind);
    if (at) this.eat();
    else if (kind === SyntaxKind.Ident && SyntaxKind.None <= this.token.kind && this.token.kind <= SyntaxKind.As) {
      this.trimErrors();
      const offset = this.nodes.length;
      this.eat();
      this.nodes[offset]!.expected(SyntaxKind[kind] || 'unknown');
    } else {
      if (
        kind === SyntaxKind.LeftParen ||
        kind === SyntaxKind.RightParen ||
        kind === SyntaxKind.LeftBracket ||
        kind === SyntaxKind.RightBracket ||
        kind === SyntaxKind.LeftBrace ||
        kind === SyntaxKind.RightBrace
      ) {
      } else if (!this.token.kindIsGrouping()) this.balanced = false;
      this.expected(SyntaxKind[kind] || 'unknown');
    }
    return at;
  }

  public expectClosingDelimiter(open: Marker, kind: SyntaxKind) {
    if (!this.eatIf(kind)) this.nodes[open.index]!.convertToError('unclosed delimiter');
  }

  public expected(thing: string | SyntaxKind) {
    if (!this.afterError()) this.expectedAt(this.beforeTrivia(), thing);
  }

  public afterError(): boolean {
    const m = this.beforeTrivia();
    return m.index > 0 && this.nodes[m.index - 1]!.kind() === SyntaxKind.Error;
  }

  public expectedAt(m: Marker, thing: string | SyntaxKind) {
    const error = SyntaxNode.error(SyntaxErrorNode.new(`expected ${thing}`), '');
    this.nodes.splice(m.index, 0, error);
  }

  public hint(hint: string) {
    const m = this.beforeTrivia();
    if (m.index > 0) {
      const error = this.nodes[m.index - 1];
      if (error && error.kind() === SyntaxKind.Error) error.hint(hint);
    }
  }

  public unexpected() {
    this.trimErrors();
    if (!this.token.kindIsGrouping()) this.balanced = false;
    const idx = this.nodes.length;
    this.eat();
    this.nodes[idx]!.unexpected();
  }

  public trimErrors() {
    const end = this.beforeTrivia().index;
    let start = end;
    while (
      start > 0 &&
      this.nodes[start - 1]!.kind() === SyntaxKind.Error &&
      this.nodes[start - 1]!.text().length === 0
    )
      start -= 1;
    this.nodes.splice(start, end - start);
  }

  /// Parses a single markup expression. This includes markup elements like text,
  /// headings, strong/emph, lists/enums, etc. This is also the entry point for
  /// parsing math equations and embedded code expressions.

  public markup(atStart: boolean, wrapTrivia: boolean, stopSet: SyntaxSet) {
    const m = wrapTrivia ? this.beforeTrivia() : this.marker();
    this.markupExprs(atStart, stopSet);
    if (wrapTrivia) {
      this.flushTrivia();
    }
    this.wrap(m, SyntaxKind.Markup);
  }

  public markupExprs(atStart: boolean, stopSet: SyntaxSet) {
    atStart = atStart || this.hadNewline();
    let nesting = 0;
    while (!this.atSet(stopSet) || (nesting > 0 && this.at(SyntaxKind.RightBracket))) {
      nesting = this.markupExpr(atStart, nesting);
      atStart = this.hadNewline();
    }
  }

  public markupExpr(atStart: boolean, nesting: number): number {
    switch (this.current()) {
      case SyntaxKind.LeftBracket:
        nesting += 1;
        this.convertAndEat(SyntaxKind.Text);
        break;
      case SyntaxKind.RightBracket:
        if (nesting > 0) {
          nesting -= 1;
          this.convertAndEat(SyntaxKind.Text);
        } else {
          this.unexpected();
          this.hint('try using a backslash escape: `\\]`');
        }
        break;
      case SyntaxKind.Shebang:
        this.eat();
        break;
      case SyntaxKind.Text:
      case SyntaxKind.Linebreak:
      case SyntaxKind.Escape:
      case SyntaxKind.Shorthand:
      case SyntaxKind.SmartQuote:
      case SyntaxKind.Link:
      case SyntaxKind.Label:
      case SyntaxKind.Raw:
        this.eat();
        break;
      case SyntaxKind.Hash:
        this.embeddedCodeExpr();
        break;
      case SyntaxKind.Star:
        this.strong();
        break;
      case SyntaxKind.Underscore:
        this.emph();
        break;
      case SyntaxKind.HeadingMarker:
        if (atStart) this.heading();
        else this.convertAndEat(SyntaxKind.Text);
        break;
      case SyntaxKind.ListMarker:
        if (atStart) this.listItem();
        else this.convertAndEat(SyntaxKind.Text);
        break;
      case SyntaxKind.EnumMarker:
        if (atStart) this.enumItem();
        else this.convertAndEat(SyntaxKind.Text);
        break;
      case SyntaxKind.TermMarker:
        if (atStart) this.termItem();
        else this.convertAndEat(SyntaxKind.Text);
        break;
      case SyntaxKind.RefMarker:
        this.reference();
        break;
      case SyntaxKind.Dollar:
        this.equation();
        break;
      case SyntaxKind.Colon:
        this.convertAndEat(SyntaxKind.Text);
        break;
      default:
        this.unexpected();
        break;
    }
    return nesting;
  }

  public strong() {
    this.withNlMode(AtNewline.StopParBreak, () => {
      const m = this.marker();
      this.assert(SyntaxKind.Star);
      this.markup(false, true, SyntaxSet.create(SyntaxKind.Star, SyntaxKind.RightBracket, SyntaxKind.End));
      this.expectClosingDelimiter(m, SyntaxKind.Star);
      this.wrap(m, SyntaxKind.Strong);
    });
  }

  public emph() {
    this.withNlMode(AtNewline.StopParBreak, () => {
      const m = this.marker();
      this.assert(SyntaxKind.Underscore);
      this.markup(false, true, SyntaxSet.create(SyntaxKind.Underscore, SyntaxKind.RightBracket, SyntaxKind.End));
      this.expectClosingDelimiter(m, SyntaxKind.Underscore);
      this.wrap(m, SyntaxKind.Emph);
    });
  }

  public heading() {
    this.withNlMode(AtNewline.Stop, () => {
      const m = this.marker();
      this.assert(SyntaxKind.HeadingMarker);
      this.markup(false, false, SyntaxSet.create(SyntaxKind.Label, SyntaxKind.RightBracket, SyntaxKind.End));
      this.wrap(m, SyntaxKind.Heading);
    });
  }

  public listItem() {
    this.withNlMode(AtNewline.RequireColumn(this.currentColumn()), () => {
      const m = this.marker();
      this.assert(SyntaxKind.ListMarker);
      this.markup(true, false, SyntaxSet.create(SyntaxKind.RightBracket, SyntaxKind.End));
      this.wrap(m, SyntaxKind.ListItem);
    });
  }

  public enumItem() {
    this.withNlMode(AtNewline.RequireColumn(this.currentColumn()), () => {
      const m = this.marker();
      this.assert(SyntaxKind.EnumMarker);
      this.markup(true, false, SyntaxSet.create(SyntaxKind.RightBracket, SyntaxKind.End));
      this.wrap(m, SyntaxKind.EnumItem);
    });
  }

  public termItem() {
    this.withNlMode(AtNewline.RequireColumn(this.currentColumn()), () => {
      const m = this.marker();
      this.withNlMode(AtNewline.Stop, () => {
        this.assert(SyntaxKind.TermMarker);
        this.markup(false, false, SyntaxSet.create(SyntaxKind.Colon, SyntaxKind.RightBracket, SyntaxKind.End));
      });
      this.expect(SyntaxKind.Colon);
      this.markup(true, false, SyntaxSet.create(SyntaxKind.RightBracket, SyntaxKind.End));
      this.wrap(m, SyntaxKind.TermItem);
    });
  }

  public reference() {
    const m = this.marker();
    this.assert(SyntaxKind.RefMarker);
    if (this.directlyAt(SyntaxKind.LeftBracket)) {
      this.contentBlock();
    }
    this.wrap(m, SyntaxKind.Ref);
  }

  public equation() {
    const m = this.marker();
    this.enterModes(SyntaxMode.Math, AtNewline.Continue, () => {
      this.assert(SyntaxKind.Dollar);
      this.math(SyntaxSet.create(SyntaxKind.Dollar, SyntaxKind.End));
      this.expectClosingDelimiter(m, SyntaxKind.Dollar);
    });
    this.wrap(m, SyntaxKind.Equation);
  }

  /// Parses the contents of a mathematical equation: `x^2 + 1`.

  public math(stopSet: SyntaxSet) {
    const m = this.marker();
    this.mathExprs(stopSet);
    this.wrap(m, SyntaxKind.Math);
  }

  public mathExprs(stopSet: SyntaxSet): number {
    let count = 0;
    while (!this.atSet(stopSet)) {
      if (this.atSet(MATH_EXPR)) {
        this.mathExpr();
        count++;
      } else {
        this.unexpected();
      }
    }
    return count;
  }

  public mathExpr() {
    this.mathExprPrec(0, SyntaxKind.End);
  }

  public mathExprPrec(minPrec: number, stop: SyntaxKind) {
    const m = this.marker();
    let continuable = false;
    switch (this.current()) {
      case SyntaxKind.Hash:
        this.embeddedCodeExpr();
        break;
      case SyntaxKind.MathIdent:
      case SyntaxKind.FieldAccess:
        continuable = true;
        this.eat();
        if (minPrec < 3 && this.directlyAt(SyntaxKind.MathText) && this.currentText() === '(') {
          this.mathArgs();
          this.wrap(m, SyntaxKind.FuncCall);
          continuable = false;
        }
        break;
      case SyntaxKind.Dot:
      case SyntaxKind.Comma:
      case SyntaxKind.Semicolon:
      case SyntaxKind.RightParen:
        this.convertAndEat(SyntaxKind.MathText);
        break;
      case SyntaxKind.Text:
      case SyntaxKind.MathText:
      case SyntaxKind.MathShorthand:
        continuable =
          mathClass(this.currentText()) === MathClass.Alphabetic ||
          Array.from(this.currentText()).every((c) => c.toLowerCase() !== c.toUpperCase());
        if (!this.maybeDelimited()) {
          this.eat();
        }
        break;
      case SyntaxKind.Linebreak:
      case SyntaxKind.MathAlignPoint:
        this.eat();
        break;
      case SyntaxKind.Escape:
      case SyntaxKind.Str:
        continuable = true;
        this.eat();
        break;
      case SyntaxKind.Root:
        if (minPrec < 3) {
          this.eat();
          const m2 = this.marker();
          this.mathExprPrec(2, stop);
          this.mathUnparen(m2);
          this.wrap(m, SyntaxKind.MathRoot);
        }
        break;
      case SyntaxKind.Prime:
        continuable = true;
        while (this.at(SyntaxKind.Prime)) {
          const m2 = this.marker();
          this.eat();
          while (this.eatIfDirect(SyntaxKind.Prime)) {}
          this.wrap(m2, SyntaxKind.MathPrimes);
        }
        break;
      default:
        this.expected('expression');
        break;
    }

    if (continuable && minPrec < 3 && !this.hadTrivia() && this.maybeDelimited()) {
      this.wrap(m, SyntaxKind.Math);
    }

    let primed = false;

    while (!this.end() && !this.at(stop)) {
      if (this.directlyAt(SyntaxKind.MathText) && this.currentText() === '!') {
        this.eat();
        this.wrap(m, SyntaxKind.Math);
        continue;
      }

      const primeMarker = this.marker();
      if (this.eatIfDirect(SyntaxKind.Prime)) {
        while (this.eatIfDirect(SyntaxKind.Prime)) {}
        this.wrap(primeMarker, SyntaxKind.MathPrimes);

        if (this.at(stop)) {
          this.wrap(m, SyntaxKind.MathAttach);
        }
        primed = true;
        continue;
      }

      const op = this.mathOp(this.current());
      if (!op) {
        if (primed) {
          this.wrap(m, SyntaxKind.MathAttach);
        }
        break;
      }

      const [kind, opStop, assoc, opPrec] = op;
      let prec = opPrec;

      if (primed && kind === SyntaxKind.MathFrac) {
        this.wrap(m, SyntaxKind.MathAttach);
      }

      if (prec < minPrec) {
        break;
      }

      if (assoc === Assoc.Left) {
        prec += 1;
      }

      if (kind === SyntaxKind.MathFrac) {
        this.mathUnparen(m);
      }

      this.eat();
      const m2 = this.marker();
      this.mathExprPrec(prec, opStop);
      this.mathUnparen(m2);

      if (this.eatIf(SyntaxKind.Underscore) || this.eatIf(SyntaxKind.Hat)) {
        const m3 = this.marker();
        this.mathExprPrec(prec, SyntaxKind.End);
        this.mathUnparen(m3);
      }

      this.wrap(m, kind);
    }
  }

  public mathOp(kind: SyntaxKind): [SyntaxKind, SyntaxKind, Assoc, number] | null {
    switch (kind) {
      case SyntaxKind.Underscore:
        return [SyntaxKind.MathAttach, SyntaxKind.Hat, Assoc.Right, 2];
      case SyntaxKind.Hat:
        return [SyntaxKind.MathAttach, SyntaxKind.Underscore, Assoc.Right, 2];
      case SyntaxKind.Slash:
        return [SyntaxKind.MathFrac, SyntaxKind.End, Assoc.Left, 1];
      default:
        return null;
    }
  }

  public maybeDelimited(): boolean {
    const cls = mathClass(this.currentText());
    const open = cls === MathClass.Opening;
    if (open) {
      this.mathDelimited();
    }
    return open;
  }

  public mathDelimited() {
    const m = this.marker();
    this.eat();
    const m2 = this.marker();
    while (!this.atSet(SyntaxSet.create(SyntaxKind.Dollar, SyntaxKind.End))) {
      if (mathClass(this.currentText()) === MathClass.Closing) {
        this.wrap(m2, SyntaxKind.Math);
        if (this.at(SyntaxKind.RightParen)) {
          this.convertAndEat(SyntaxKind.MathText);
        } else {
          this.eat();
        }
        this.wrap(m, SyntaxKind.MathDelimited);
        return;
      }

      if (this.atSet(MATH_EXPR)) {
        this.mathExpr();
      } else {
        this.unexpected();
      }
    }
    this.wrap(m, SyntaxKind.Math);
  }

  public mathUnparen(m: Marker) {
    const node = this.nodes[m.index];
    if (node && node.kind() === SyntaxKind.MathDelimited) {
      const children = (node as InnerNode).childrenMut();
      if (children && children.length >= 2) {
        const first = children[0] as any;
        const last = children[children.length - 1] as any;
        if (first.text() === '(' && last.text() === ')') {
          first._kind = SyntaxKind.LeftParen;
          last._kind = SyntaxKind.RightParen;
          (node as any)._kind = SyntaxKind.Math;
        }
      }
    }
  }

  public mathArgs() {
    const m = this.marker();
    this.convertAndEat(SyntaxKind.LeftParen);

    let positional = true;
    let hasArrays = false;

    let maybeArrayStart = this.marker();
    const seen = new Set<string>();

    while (!this.atSet(SyntaxSet.create(SyntaxKind.End, SyntaxKind.Dollar, SyntaxKind.RightParen))) {
      positional = this.mathArg(seen);

      switch (this.current()) {
        case SyntaxKind.Comma:
          this.eat();
          if (!positional) {
            maybeArrayStart = this.marker();
          }
          break;
        case SyntaxKind.Semicolon:
          if (!positional) {
            maybeArrayStart = this.marker();
          }
          this.wrap(maybeArrayStart, SyntaxKind.Array);
          this.eat();
          maybeArrayStart = this.marker();
          hasArrays = true;
          break;
        case SyntaxKind.End:
        case SyntaxKind.Dollar:
        case SyntaxKind.RightParen:
          break;
        default:
          this.expected('comma or semicolon');
          break;
      }
    }

    if (maybeArrayStart.index !== this.marker().index && hasArrays && positional) {
      this.wrap(maybeArrayStart, SyntaxKind.Array);
    }

    this.expectClosingDelimiter(m, SyntaxKind.RightParen);
    this.wrap(m, SyntaxKind.Args);
  }

  public mathArg(seen: Set<string>): boolean {
    const m = this.marker();
    const start = this.currentStart();

    if (this.at(SyntaxKind.Dot)) {
      const spread = this.lexer.maybeMathSpreadArg(start);
      if (spread) {
        this.token.node = spread;
        this.eat();
        const mArg = this.marker();
        const count = this.mathExprs(
          SyntaxSet.create(
            SyntaxKind.End,
            SyntaxKind.Dollar,
            SyntaxKind.Comma,
            SyntaxKind.Semicolon,
            SyntaxKind.RightParen,
          ),
        );
        if (count === 0) {
          const dots = [
            new LeafNode(SyntaxKind.MathText, '.', this.token.node.span()),
            new LeafNode(SyntaxKind.MathText, '.', this.token.node.span()),
          ];
          this.nodes[m.index] = new InnerNode(SyntaxKind.Math, dots);
        } else {
          if (count > 1) this.wrap(mArg, SyntaxKind.Math);
          this.wrap(m, SyntaxKind.Spread);
        }
        return true;
      }
    }

    let positional = true;
    if (this.atSet(SyntaxSet.create(SyntaxKind.MathText, SyntaxKind.MathIdent, SyntaxKind.Underscore))) {
      const named = this.lexer.maybeMathNamedArg(start);
      if (named) {
        this.token.node = named;
        const text = this.currentText();
        this.eat();
        this.convertAndEat(SyntaxKind.Colon);
        if (seen.has(text)) {
          this.nodes[m.index]!.convertToError(`duplicate argument: ${text}`);
        }
        seen.add(text);
        positional = false;
      }
    }

    const arg = this.marker();
    const count = this.mathExprs(
      SyntaxSet.create(
        SyntaxKind.End,
        SyntaxKind.Dollar,
        SyntaxKind.Comma,
        SyntaxKind.Semicolon,
        SyntaxKind.RightParen,
      ),
    );
    if (count === 0) {
      if (!positional) this.expected('expression');
      this.flushTrivia();
    }

    if (count !== 1) {
      this.wrap(arg, SyntaxKind.Math);
    }

    if (!positional) {
      this.wrap(m, SyntaxKind.Named);
    }
    return positional;
  }

  /// Parses the contents of a code block.

  public code(stopSet: SyntaxSet) {
    const m = this.marker();
    this.codeExprs(stopSet);
    this.wrap(m, SyntaxKind.Code);
  }

  public codeExprs(stopSet: SyntaxSet) {
    while (!this.atSet(stopSet)) {
      this.withNlMode(AtNewline.ContextualContinue, () => {
        if (!this.atSet(CODE_EXPR)) {
          this.unexpected();
          return;
        }
        this.codeExpr();
        if (!this.atSet(stopSet) && !this.eatIf(SyntaxKind.Semicolon)) {
          if (!this.hadNewline()) {
            this.expected('semicolon or line break');
            if (this.at(SyntaxKind.Label)) {
              this.hint('labels can only be applied in markup mode');
              this.hint('try wrapping your code in a markup block (`[ ]`)');
            }
          }
        }
      });
    }
  }

  public embeddedCodeExpr() {
    this.enterModes(SyntaxMode.Code, AtNewline.Stop, () => {
      this.assert(SyntaxKind.Hash);
      if (this.hadTrivia() || this.end()) {
        this.expected('expression');
        return;
      }

      const stmt = this.atSet(STMT);
      const at = this.atSet(ATOMIC_CODE_EXPR);
      this.codeExprPrec(true, 0);

      if (!at) {
        this.unexpected();
      }

      const semi = (stmt || this.directlyAt(SyntaxKind.Semicolon)) && this.eatIf(SyntaxKind.Semicolon);

      if (stmt && !semi && !this.end() && !this.at(SyntaxKind.RightBracket)) {
        this.expected('semicolon or line break');
      }
    });
  }

  public codeExpr() {
    this.codeExprPrec(false, 0);
  }

  public codeExprPrec(atomic: boolean, minPrec: number) {
    const m = this.marker();
    if (!atomic && this.atSet(UNARY_OP)) {
      const opPrec = unOpPrecedence(this.current());
      this.eat();
      this.codeExprPrec(atomic, opPrec);
      this.wrap(m, SyntaxKind.Unary);
    } else {
      this.codePrimary(atomic);
    }

    while (true) {
      if (this.directlyAt(SyntaxKind.LeftParen) || this.directlyAt(SyntaxKind.LeftBracket)) {
        this.args();
        this.wrap(m, SyntaxKind.FuncCall);
        continue;
      }

      const atFieldOrMethod =
        this.directlyAt(SyntaxKind.Dot) &&
        (() => {
          const cloneLexer = new Lexer(this.text, this.lexer.mode);
          cloneLexer.jump(this.lexer.cursor());
          return cloneLexer.next()[0] === SyntaxKind.Ident;
        })();

      if (atomic && !atFieldOrMethod) {
        break;
      }

      if (this.eatIf(SyntaxKind.Dot)) {
        this.expect(SyntaxKind.Ident);
        this.wrap(m, SyntaxKind.FieldAccess);
        continue;
      }

      let opKind: SyntaxKind | 'NotIn' | null = null;
      if (this.atSet(BINARY_OP)) {
        opKind = this.current();
      } else if (minPrec <= binOpPrecedence('NotIn') && this.eatIf(SyntaxKind.Not)) {
        if (this.at(SyntaxKind.In)) {
          opKind = 'NotIn';
        } else {
          this.expected('keyword `in`');
          break;
        }
      }

      if (opKind) {
        let prec = binOpPrecedence(opKind);
        if (prec < minPrec) {
          break;
        }

        if (binOpAssoc(opKind) === Assoc.Left) {
          prec += 1;
        }

        this.eat();
        this.codeExprPrec(false, prec);
        this.wrap(m, SyntaxKind.Binary);
        continue;
      }

      break;
    }
  }

  public codePrimary(atomic: boolean) {
    const m = this.marker();
    switch (this.current()) {
      case SyntaxKind.Ident:
        this.eat();
        if (!atomic && this.at(SyntaxKind.Arrow)) {
          this.wrap(m, SyntaxKind.Params);
          this.assert(SyntaxKind.Arrow);
          this.codeExpr();
          this.wrap(m, SyntaxKind.Closure);
        }
        break;
      case SyntaxKind.Underscore:
        if (!atomic) {
          this.eat();
          if (this.at(SyntaxKind.Arrow)) {
            this.wrap(m, SyntaxKind.Params);
            this.eat();
            this.codeExpr();
            this.wrap(m, SyntaxKind.Closure);
          } else if (this.eatIf(SyntaxKind.Eq)) {
            this.codeExpr();
            this.wrap(m, SyntaxKind.DestructAssignment);
          } else {
            this.nodes[m.index]!.expected('expression');
          }
        } else {
          this.expected('expression');
        }
        break;
      case SyntaxKind.LeftBrace:
        this.codeBlock();
        break;
      case SyntaxKind.LeftBracket:
        this.contentBlock();
        break;
      case SyntaxKind.LeftParen:
        this.exprWithParen(atomic);
        break;
      case SyntaxKind.Dollar:
        this.equation();
        break;
      case SyntaxKind.Let:
        this.letBinding();
        break;
      case SyntaxKind.Set:
        this.setRule();
        break;
      case SyntaxKind.Show:
        this.showRule();
        break;
      case SyntaxKind.Context:
        this.contextual(atomic);
        break;
      case SyntaxKind.If:
        this.conditional();
        break;
      case SyntaxKind.While:
        this.whileLoop();
        break;
      case SyntaxKind.For:
        this.forLoop();
        break;
      case SyntaxKind.Import:
        this.moduleImport();
        break;
      case SyntaxKind.Include:
        this.moduleInclude();
        break;
      case SyntaxKind.Break:
        this.breakStmt();
        break;
      case SyntaxKind.Continue:
        this.continueStmt();
        break;
      case SyntaxKind.Return:
        this.returnStmt();
        break;
      case SyntaxKind.Raw:
        this.eat();
        break;
      case SyntaxKind.None:
      case SyntaxKind.Auto:
      case SyntaxKind.Int:
      case SyntaxKind.Float:
      case SyntaxKind.Bool:
      case SyntaxKind.Numeric:
      case SyntaxKind.Str:
      case SyntaxKind.Label:
        this.eat();
        break;
      default:
        this.expected('expression');
        break;
    }
  }

  public block() {
    switch (this.current()) {
      case SyntaxKind.LeftBracket:
        this.contentBlock();
        break;
      case SyntaxKind.LeftBrace:
        this.codeBlock();
        break;
      default:
        this.expected('block');
        break;
    }
  }

  public codeBlock() {
    const m = this.marker();
    this.enterModes(SyntaxMode.Code, AtNewline.Continue, () => {
      this.assert(SyntaxKind.LeftBrace);
      this.code(
        SyntaxSet.create(SyntaxKind.RightBrace, SyntaxKind.RightBracket, SyntaxKind.RightParen, SyntaxKind.End),
      );
      this.expectClosingDelimiter(m, SyntaxKind.RightBrace);
    });
    this.wrap(m, SyntaxKind.CodeBlock);
  }

  public contentBlock() {
    const m = this.marker();
    this.enterModes(SyntaxMode.Markup, AtNewline.Continue, () => {
      this.assert(SyntaxKind.LeftBracket);
      this.markup(true, true, SyntaxSet.create(SyntaxKind.RightBracket, SyntaxKind.End));
      this.expectClosingDelimiter(m, SyntaxKind.RightBracket);
    });
    this.wrap(m, SyntaxKind.ContentBlock);
  }

  public letBinding() {
    const m = this.marker();
    this.assert(SyntaxKind.Let);

    const m2 = this.marker();
    let closure = false;
    let other = false;

    if (this.eatIf(SyntaxKind.Ident)) {
      if (this.directlyAt(SyntaxKind.LeftParen)) {
        this.params();
        closure = true;
      }
    } else {
      const seen = new Set<string>();
      this.pattern(false, seen, null);
      other = true;
    }

    if (closure || other ? this.expect(SyntaxKind.Eq) : this.eatIf(SyntaxKind.Eq)) {
      this.codeExpr();
    }

    if (closure) {
      this.wrap(m2, SyntaxKind.Closure);
    }

    this.wrap(m, SyntaxKind.LetBinding);
  }

  public setRule() {
    const m = this.marker();
    this.assert(SyntaxKind.Set);

    const m2 = this.marker();
    this.expect(SyntaxKind.Ident);
    while (this.eatIf(SyntaxKind.Dot)) {
      this.expect(SyntaxKind.Ident);
      this.wrap(m2, SyntaxKind.FieldAccess);
    }

    this.args();
    if (this.eatIf(SyntaxKind.If)) {
      this.codeExpr();
    }
    this.wrap(m, SyntaxKind.SetRule);
  }

  public showRule() {
    const m = this.marker();
    this.assert(SyntaxKind.Show);
    const m2 = this.beforeTrivia();

    if (!this.at(SyntaxKind.Colon)) {
      this.codeExpr();
    }

    if (this.eatIf(SyntaxKind.Colon)) {
      this.codeExpr();
    } else {
      this.expectedAt(m2, 'colon');
    }

    this.wrap(m, SyntaxKind.ShowRule);
  }

  public contextual(atomic: boolean) {
    const m = this.marker();
    this.assert(SyntaxKind.Context);
    this.codeExprPrec(atomic, 0);
    this.wrap(m, SyntaxKind.Contextual);
  }

  public conditional() {
    const m = this.marker();
    this.assert(SyntaxKind.If);
    this.codeExpr();
    this.block();
    if (this.eatIf(SyntaxKind.Else)) {
      if (this.at(SyntaxKind.If)) {
        this.conditional();
      } else {
        this.block();
      }
    }
    this.wrap(m, SyntaxKind.Conditional);
  }

  public whileLoop() {
    const m = this.marker();
    this.assert(SyntaxKind.While);
    this.codeExpr();
    this.block();
    this.wrap(m, SyntaxKind.WhileLoop);
  }

  public forLoop() {
    const m = this.marker();
    this.assert(SyntaxKind.For);

    const seen = new Set<string>();
    this.pattern(false, seen, null);

    if (this.at(SyntaxKind.Comma)) {
      const node = this.eatAndGet();
      node.unexpected();
      node.hint('destructuring patterns must be wrapped in parentheses');
      if (this.atSet(PATTERN)) {
        this.pattern(false, seen, null);
      }
    }

    this.expect(SyntaxKind.In);
    this.codeExpr();
    this.block();
    this.wrap(m, SyntaxKind.ForLoop);
  }

  public moduleImport() {
    const m = this.marker();
    this.assert(SyntaxKind.Import);
    this.codeExpr();
    if (this.eatIf(SyntaxKind.As)) {
      this.expect(SyntaxKind.Ident);
    }

    if (this.eatIf(SyntaxKind.Colon)) {
      if (this.at(SyntaxKind.LeftParen)) {
        this.withNlMode(AtNewline.Continue, () => {
          const m2 = this.marker();
          this.assert(SyntaxKind.LeftParen);
          this.importItems();
          this.expectClosingDelimiter(m2, SyntaxKind.RightParen);
        });
      } else if (!this.eatIf(SyntaxKind.Star)) {
        this.importItems();
      }
    }
    this.wrap(m, SyntaxKind.ModuleImport);
  }

  public importItems() {
    const m = this.marker();
    while (
      ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(this.current())
    ) {
      const itemMarker = this.marker();
      if (!this.eatIf(SyntaxKind.Ident)) this.unexpected();

      while (this.eatIf(SyntaxKind.Dot)) this.expect(SyntaxKind.Ident);
      this.wrap(itemMarker, SyntaxKind.ImportItemPath);

      if (this.eatIf(SyntaxKind.As)) {
        this.expect(SyntaxKind.Ident);
        this.wrap(itemMarker, SyntaxKind.RenamedImportItem);
      }

      const isTerminator =
        this.current() === SyntaxKind.End ||
        this.current() === SyntaxKind.RightParen ||
        this.current() === SyntaxKind.RightBracket ||
        this.current() === SyntaxKind.RightBrace;
      if (!isTerminator) this.expect(SyntaxKind.Comma);
    }
    this.wrap(m, SyntaxKind.ImportItems);
  }

  public moduleInclude() {
    const m = this.marker();
    this.assert(SyntaxKind.Include);
    this.codeExpr();
    this.wrap(m, SyntaxKind.ModuleInclude);
  }

  public breakStmt() {
    const m = this.marker();
    this.assert(SyntaxKind.Break);
    this.wrap(m, SyntaxKind.LoopBreak);
  }

  public continueStmt() {
    const m = this.marker();
    this.assert(SyntaxKind.Continue);
    this.wrap(m, SyntaxKind.LoopContinue);
  }

  public returnStmt() {
    const m = this.marker();
    this.assert(SyntaxKind.Return);
    if (this.atSet(CODE_EXPR)) {
      this.codeExpr();
    }
    this.wrap(m, SyntaxKind.FuncReturn);
  }

  public exprWithParen(atomic: boolean) {
    if (atomic) {
      this.parenthesizedOrArrayOrDict();
      return;
    }

    const res = this.restoreMemoOrCheckpoint();
    if (!res) return;
    const [memoKey, checkpoint] = res;

    const prevLen = checkpoint.nodeLen;

    const kind = this.parenthesizedOrArrayOrDict();

    if (this.at(SyntaxKind.Arrow)) {
      this.restore(checkpoint);
      const m = this.marker();
      this.params();
      if (!this.expect(SyntaxKind.Arrow)) {
        return;
      }
      this.codeExpr();
      this.wrap(m, SyntaxKind.Closure);
    } else if (this.at(SyntaxKind.Eq) && kind !== SyntaxKind.Parenthesized) {
      this.restore(checkpoint!);
      const m = this.marker();
      const seen = new Set<string>();
      this.destructuringOrParenthesized(true, seen);
      if (!this.expect(SyntaxKind.Eq)) {
        return;
      }
      this.codeExpr();
      this.wrap(m, SyntaxKind.DestructAssignment);
    } else {
      return;
    }

    this.memoizeParsedNodes(memoKey, prevLen);
  }

  public parenthesizedOrArrayOrDict(): SyntaxKind {
    const state = { count: 0, maybeJustParens: true, kind: null as SyntaxKind | null, seen: new Set<string>() };
    const m = this.marker();
    this.withNlMode(AtNewline.Continue, () => {
      this.assert(SyntaxKind.LeftParen);
      if (this.eatIf(SyntaxKind.Colon)) {
        state.kind = SyntaxKind.Dict;
      }

      while (
        ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
          this.current(),
        )
      ) {
        if (!this.atSet(ARRAY_OR_DICT_ITEM)) {
          this.unexpected();
          continue;
        }

        this.arrayOrDictItem(state);
        state.count++;

        if (
          ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
            this.current(),
          ) &&
          this.expect(SyntaxKind.Comma)
        ) {
          state.maybeJustParens = false;
        }
      }

      this.expectClosingDelimiter(m, SyntaxKind.RightParen);
    });

    const kind =
      state.maybeJustParens && state.count === 1 ? SyntaxKind.Parenthesized : (state.kind ?? SyntaxKind.Array);
    this.wrap(m, kind);
    return kind;
  }

  /// State for array/dictionary parsing.

  public arrayOrDictItem(state: {
    count: number;
    maybeJustParens: boolean;
    kind: SyntaxKind | null;
    seen: Set<string>;
  }) {
    const m = this.marker();

    if (this.eatIf(SyntaxKind.Dots)) {
      this.codeExpr();
      this.wrap(m, SyntaxKind.Spread);
      state.maybeJustParens = false;
      return;
    }

    this.codeExpr();

    if (this.eatIf(SyntaxKind.Colon)) {
      this.codeExpr();
      const node = this.nodes[m.index]!;
      const pairKind = node.kind() === SyntaxKind.Ident ? SyntaxKind.Named : SyntaxKind.Keyed;

      let key: string | null = null;
      if (node.kind() === SyntaxKind.Ident) {
        key = node.text();
      } else if (node.kind() === SyntaxKind.Str) {
        key = node.text();
      }

      if (key && state.seen.has(key)) {
        node.convertToError(`duplicate key: ${key}`);
      }
      if (key) state.seen.add(key);

      this.wrap(m, pairKind);
      state.maybeJustParens = false;

      if (state.kind === SyntaxKind.Array) {
        this.nodes[m.index]!.expected('expression');
      } else {
        state.kind = SyntaxKind.Dict;
      }
    } else {
      if (state.kind === SyntaxKind.Dict) {
        this.nodes[m.index]!.expected('named or keyed pair');
      } else {
        state.kind = SyntaxKind.Array;
      }
    }
  }

  public args() {
    if (!this.directlyAt(SyntaxKind.LeftParen) && !this.directlyAt(SyntaxKind.LeftBracket)) {
      this.expected('argument list');
      if (this.at(SyntaxKind.LeftParen) || this.at(SyntaxKind.LeftBracket)) {
        this.hint('there may not be any spaces before the argument list');
      }
    }

    const m = this.marker();
    if (this.at(SyntaxKind.LeftParen)) {
      const m2 = this.marker();
      this.withNlMode(AtNewline.Continue, () => {
        this.assert(SyntaxKind.LeftParen);
        const seen = new Set<string>();
        while (
          ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
            this.current(),
          )
        ) {
          if (!this.atSet(ARG)) {
            this.unexpected();
            continue;
          }
          this.arg(seen);
          if (
            ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
              this.current(),
            )
          ) {
            this.expect(SyntaxKind.Comma);
          }
        }
        this.expectClosingDelimiter(m2, SyntaxKind.RightParen);
      });
    }

    while (this.directlyAt(SyntaxKind.LeftBracket)) {
      this.contentBlock();
    }
    this.wrap(m, SyntaxKind.Args);
  }

  public arg(seen: Set<string>) {
    const m = this.marker();

    if (this.eatIf(SyntaxKind.Dots)) {
      this.codeExpr();
      this.wrap(m, SyntaxKind.Spread);
      return;
    }

    const wasAtExpr = this.atSet(CODE_EXPR);
    const text = this.currentText();
    this.codeExpr();

    if (this.eatIf(SyntaxKind.Colon)) {
      if (wasAtExpr) {
        if (this.nodes[m.index]!.kind() !== SyntaxKind.Ident) {
          this.nodes[m.index]!.expected('identifier');
        } else if (seen.has(text)) {
          this.nodes[m.index]!.convertToError(`duplicate argument: ${text}`);
        } else {
          seen.add(text);
        }
      }

      this.codeExpr();
      this.wrap(m, SyntaxKind.Named);
    }
  }

  public params() {
    const m = this.marker();
    this.withNlMode(AtNewline.Continue, () => {
      this.assert(SyntaxKind.LeftParen);
      const seen = new Set<string>();
      const state = { sink: false };

      while (
        ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
          this.current(),
        )
      ) {
        if (!this.atSet(PARAM)) {
          this.unexpected();
          continue;
        }

        this.param(seen, state);
        if (
          ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
            this.current(),
          )
        ) {
          this.expect(SyntaxKind.Comma);
        }
      }
      this.expectClosingDelimiter(m, SyntaxKind.RightParen);
    });
    this.wrap(m, SyntaxKind.Params);
  }

  public param(seen: Set<string>, state: { sink: boolean }) {
    const m = this.marker();

    if (this.eatIf(SyntaxKind.Dots)) {
      if (this.atSet(PATTERN_LEAF)) {
        this.patternLeaf(false, seen, 'parameter');
      }
      this.wrap(m, SyntaxKind.Spread);
      if (state.sink) {
        this.nodes[m.index]!.convertToError('only one argument sink is allowed');
      }
      state.sink = true;
      return;
    }

    const wasAtPat = this.atSet(PATTERN);
    this.pattern(false, seen, 'parameter');

    if (this.eatIf(SyntaxKind.Colon)) {
      if (wasAtPat && this.nodes[m.index]!.kind() !== SyntaxKind.Ident) {
        this.nodes[m.index]!.expected('identifier');
      }
      this.codeExpr();
      this.wrap(m, SyntaxKind.Named);
    }
  }

  public pattern(reassignment: boolean, seen: Set<string>, dupe: string | null) {
    if (this.at(SyntaxKind.Underscore)) {
      this.eat();
    } else if (this.at(SyntaxKind.LeftParen)) {
      this.destructuringOrParenthesized(reassignment, seen);
    } else {
      this.patternLeaf(reassignment, seen, dupe);
    }
  }

  public destructuringOrParenthesized(reassignment: boolean, seen: Set<string>) {
    let sink = false;
    let count = 0;
    let maybeJustParens = true;

    const m = this.marker();
    this.withNlMode(AtNewline.Continue, () => {
      this.assert(SyntaxKind.LeftParen);

      while (
        ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
          this.current(),
        )
      ) {
        if (!this.atSet(DESTRUCTURING_ITEM)) {
          this.unexpected();
          continue;
        }

        const stateObj = { sink, maybeJustParens };
        this.destructuringItem(reassignment, seen, stateObj);
        sink = stateObj.sink;
        maybeJustParens = stateObj.maybeJustParens;

        count++;

        if (
          ![SyntaxKind.End, SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace].includes(
            this.current(),
          ) &&
          this.expect(SyntaxKind.Comma)
        ) {
          maybeJustParens = false;
        }
      }
      this.expectClosingDelimiter(m, SyntaxKind.RightParen);
    });

    if (maybeJustParens && count === 1 && !sink) {
      this.wrap(m, SyntaxKind.Parenthesized);
    } else {
      this.wrap(m, SyntaxKind.Destructuring);
    }
  }

  public destructuringItem(
    reassignment: boolean,
    seen: Set<string>,
    state: { maybeJustParens: boolean; sink: boolean },
  ) {
    const m = this.marker();

    if (this.eatIf(SyntaxKind.Dots)) {
      if (this.atSet(PATTERN_LEAF)) {
        this.patternLeaf(reassignment, seen, null);
      }
      this.wrap(m, SyntaxKind.Spread);
      if (state.sink) {
        this.nodes[m.index]!.convertToError('only one destructuring sink is allowed');
      }
      state.sink = true;
      return;
    }

    const wasAtPat = this.atSet(PATTERN);

    const checkpoint = this.checkpoint();
    if (!(this.eatIf(SyntaxKind.Ident) && this.at(SyntaxKind.Colon))) {
      this.restore(checkpoint);
      this.pattern(reassignment, seen, null);
    }

    if (this.eatIf(SyntaxKind.Colon)) {
      if (wasAtPat && this.nodes[m.index]!.kind() !== SyntaxKind.Ident) {
        this.nodes[m.index]!.expected('identifier');
      }
      this.pattern(reassignment, seen, null);
      this.wrap(m, SyntaxKind.Named);
      state.maybeJustParens = false;
    }
  }

  public patternLeaf(reassignment: boolean, seen: Set<string>, dupe: string | null) {
    if (SyntaxKind.isKeyword(this.current())) {
      this.eatAndGet().expected('pattern');
      return;
    } else if (!this.atSet(PATTERN_LEAF)) {
      this.expected('pattern');
      return;
    }

    const m = this.marker();
    const text = this.currentText();
    this.codeExprPrec(true, 0);

    if (!reassignment) {
      const node = this.nodes[m.index];
      if (node && node.kind() === SyntaxKind.Ident) {
        if (seen.has(text)) {
          node.convertToError(`duplicate ${dupe || 'binding'}: ${text}`);
        } else {
          seen.add(text);
        }
      } else if (node) {
        node.expected('pattern');
      }
    }
  }
}

export enum Assoc {
  Left,
  Right,
}

function binOpPrecedence(kind: SyntaxKind | 'NotIn'): number {
  if (kind === 'NotIn') return 4;
  switch (kind) {
    case SyntaxKind.Star:
    case SyntaxKind.Slash:
      return 6;
    case SyntaxKind.Plus:
    case SyntaxKind.Minus:
      return 5;
    case SyntaxKind.EqEq:
    case SyntaxKind.ExclEq:
    case SyntaxKind.Lt:
    case SyntaxKind.LtEq:
    case SyntaxKind.Gt:
    case SyntaxKind.GtEq:
    case SyntaxKind.In:
      return 4;
    case SyntaxKind.And:
      return 3;
    case SyntaxKind.Or:
      return 2;
    case SyntaxKind.Eq:
    case SyntaxKind.PlusEq:
    case SyntaxKind.HyphEq:
    case SyntaxKind.StarEq:
    case SyntaxKind.SlashEq:
      return 1;
    default:
      return 0;
  }
}

function binOpAssoc(kind: SyntaxKind | 'NotIn'): Assoc {
  if (kind === 'NotIn') return Assoc.Left;
  switch (kind) {
    case SyntaxKind.Eq:
    case SyntaxKind.PlusEq:
    case SyntaxKind.HyphEq:
    case SyntaxKind.StarEq:
    case SyntaxKind.SlashEq:
      return Assoc.Right;
    default:
      return Assoc.Left;
  }
}

function unOpPrecedence(kind: SyntaxKind): number {
  switch (kind) {
    case SyntaxKind.Plus:
    case SyntaxKind.Minus:
      return 7;
    case SyntaxKind.Not:
      return 4;
    default:
      return 0;
  }
}

export function reparseCode(text: string, rangeStart: number, rangeEnd: number): SyntaxNode[] | null {
  const p = new Parser(text, rangeStart, SyntaxMode.Code);
  p.codeExprs(SyntaxSet.create(SyntaxKind.End));
  if (p.balanced && p.currentStart() === rangeEnd) {
    return p.finish();
  }
  return null;
}

export function reparseMath(text: string, rangeStart: number, rangeEnd: number): SyntaxNode[] | null {
  const p = new Parser(text, rangeStart, SyntaxMode.Math);
  p.mathExprs(SyntaxSet.create(SyntaxKind.End));
  if (p.balanced && p.currentStart() === rangeEnd) {
    return p.finish();
  }
  return null;
}

export function reparseBlock(text: string, rangeStart: number, rangeEnd: number): SyntaxNode | null {
  const p = new Parser(text, rangeStart, SyntaxMode.Code);
  if (p.current() !== SyntaxKind.LeftBracket && p.current() !== SyntaxKind.LeftBrace) {
    throw new Error('Expected LeftBracket or LeftBrace');
  }
  p.block();
  if (p.balanced && p.prevEnd() === rangeEnd) {
    return p.finish()[0] || null;
  }
  return null;
}

export class Token {
  constructor(
    public kind: SyntaxKind,
    public node: SyntaxNode,
    public nTrivia: number,
    public newline: Newline | null,
    public start: number,
    public prevEnd: number,
  ) {}

  clone(): Token {
    return new Token(
      this.kind,
      this.node.clone(),
      this.nTrivia,
      this.newline ? { ...this.newline } : null,
      this.start,
      this.prevEnd,
    );
  }

  kindIsGrouping(): boolean {
    const kind = this.kind;
    return (
      kind === SyntaxKind.LeftParen ||
      kind === SyntaxKind.RightParen ||
      kind === SyntaxKind.LeftBracket ||
      kind === SyntaxKind.RightBracket ||
      kind === SyntaxKind.LeftBrace ||
      kind === SyntaxKind.RightBrace
    );
  }
}

export interface Newline {
  column: number | null;
  parbreak: boolean;
}

export enum AtNewlineKind {
  Continue,
  Stop,
  ContextualContinue,
  StopParBreak,
  RequireColumn,
}

export class AtNewline {
  constructor(
    public kind: AtNewlineKind,
    public minCol: number = 0,
  ) {}

  static Continue = new AtNewline(AtNewlineKind.Continue);
  static Stop = new AtNewline(AtNewlineKind.Stop);
  static ContextualContinue = new AtNewline(AtNewlineKind.ContextualContinue);
  static StopParBreak = new AtNewline(AtNewlineKind.StopParBreak);
  static RequireColumn(minCol: number) {
    return new AtNewline(AtNewlineKind.RequireColumn, minCol);
  }

  stopAt(newline: Newline, kind: SyntaxKind): boolean {
    switch (this.kind) {
      case AtNewlineKind.Continue:
        return false;
      case AtNewlineKind.Stop:
        return true;
      case AtNewlineKind.ContextualContinue:
        if (kind === SyntaxKind.Else || kind === SyntaxKind.Dot || SyntaxKind.isGrouping(kind)) return false;
        return true;
      case AtNewlineKind.StopParBreak:
        return newline.parbreak;
      case AtNewlineKind.RequireColumn:
        if (newline.column !== null && newline.column <= this.minCol) return true;
        return false;
    }
  }
}

export class Marker {
  constructor(public index: number) {}
}

export class MemoArena {
  public arena: SyntaxNode[] = [];
  public memoMap: Map<number, [number, number, PartialState]> = new Map();
}

export class Checkpoint {
  constructor(
    public nodeLen: number,
    public state: PartialState,
  ) {}
}

export class PartialState {
  constructor(
    public cursor: number,
    public lexMode: SyntaxMode,
    public token: Token,
  ) {}

  clone(): PartialState {
    return new PartialState(this.cursor, this.lexMode, this.token.clone());
  }
}
