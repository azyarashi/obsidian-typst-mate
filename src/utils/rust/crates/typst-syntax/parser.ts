import { type Lexer, SyntaxKind, SyntaxMode, type SyntaxNode } from '.';

type SyntaxSet = Set<SyntaxKind>;

export class Parser {
  private lexer: Lexer;
  private children: SyntaxNode[] = [];
  private rootKind: SyntaxKind;
  private stopAtNewline = false;

  private currentToken: SyntaxNode;

  constructor(text: string, rootKind: SyntaxKind = SyntaxKind.Markup) {
    this.lexer = new Lexer(text, SyntaxMode.Markup);
    this.rootKind = rootKind;
    this.currentToken = this.lexer.next();
  }

  parse(): SyntaxNode {
    if (this.rootKind === SyntaxKind.Markup) {
      this.markupExprs(new Set([SyntaxKind.End]));
    } else if (this.rootKind === SyntaxKind.Math) {
      this.lexer.setMode(SyntaxMode.Math);
      while (!this.at(SyntaxKind.End)) {
        this.mathExpr();
      }
    } else if (this.rootKind === SyntaxKind.Code) {
      this.lexer.setMode(SyntaxMode.Code);
      while (!this.at(SyntaxKind.End)) {
        this.codeExpr();
        if (this.at(SyntaxKind.Semicolon)) this.eat();
      }
    }

    return this.finishInto(this.rootKind);
  }

  // --- Core Parsing Primitives ---

  private marker(): number {
    return this.children.length;
  }

  private wrap(marker: number, kind: SyntaxKind) {
    const childrenToWrap = this.children.splice(marker);

    let from = 0;
    let to = 0;
    if (childrenToWrap.length > 0) {
      from = childrenToWrap[0]!.from;
      to = childrenToWrap[childrenToWrap.length - 1]!.to;
    } else if (this.currentToken) {
      from = this.currentToken.from;
      to = from;
    }

    const node: SyntaxNode = {
      kind,
      from,
      to,
      children: childrenToWrap,
    };

    for (const child of childrenToWrap) {
      child.parent = node;
    }

    this.children.push(node);
  }

  private eat() {
    this.children.push(this.currentToken);
    this.currentToken = this.lexer.next();
  }

  private unexpected() {
    if (this.current === SyntaxKind.End) return;
    this.eat();
  }

  private get current(): SyntaxKind {
    return this.currentToken.kind;
  }

  private at(kind: SyntaxKind): boolean {
    return this.current === kind;
  }

  private atSet(set: SyntaxSet): boolean {
    return set.has(this.current);
  }

  private expect(kind: SyntaxKind) {
    if (this.at(kind)) {
      this.eat();
    } else {
      // Error handling
    }
  }

  private finishInto(kind: SyntaxKind): SyntaxNode {
    const node: SyntaxNode = {
      kind,
      from: this.children.length > 0 ? this.children[0].from : 0,
      to: this.children.length > 0 ? this.children[this.children.length - 1].to : 0,
      children: this.children,
    };

    for (const child of this.children) {
      child.parent = node;
    }
    this.children = [];
    return node;
  }

  // --- Markup ---

  private markupExprs(stopSet: SyntaxSet) {
    while (!this.atSet(stopSet) && !this.at(SyntaxKind.End)) {
      if (this.at(SyntaxKind.RightBracket)) {
        break;
      }
      this.markupExpr();
    }
  }

  private markupExpr() {
    switch (this.current) {
      case SyntaxKind.Space:
      case SyntaxKind.Parbreak:
      case SyntaxKind.Linebreak:
      case SyntaxKind.Text:
      case SyntaxKind.SmartQuote:
        this.eat();
        break;

      case SyntaxKind.Star:
        this.strong();
        break;
      case SyntaxKind.Underscore:
        this.emph();
        break;
      case SyntaxKind.HeadingMarker:
        this.heading();
        break;
      case SyntaxKind.ListMarker:
        this.listItem();
        break;
      case SyntaxKind.EnumMarker:
        this.enumItem();
        break;
      case SyntaxKind.TermMarker:
        this.termItem();
        break;
      case SyntaxKind.Dollar:
        this.equation();
        break;
      case SyntaxKind.Hash:
        this.embeddedCode();
        break;
      case SyntaxKind.Raw:
        this.eat();
        break;
      case SyntaxKind.Label:
        this.eat();
        break;
      case SyntaxKind.RefMarker:
        this.reference();
        break;
      case SyntaxKind.LeftBracket:
        this.eat(); // consume [
        // Nested markup? Should we parse nested markup?
        // [ text ] is just generic text in some contexts or content block?
        // In pure markup usually means nested content, but purely textual often.
        // Let's recurse markupExprs
        this.markupExprs(new Set([SyntaxKind.RightBracket]));
        // Expect RightBracket
        if (this.at(SyntaxKind.RightBracket)) this.eat();
        break;
      case SyntaxKind.RightBracket:
        this.eat();
        break;

      default:
        this.eat();
    }
  }

  private strong() {
    const m = this.marker();
    this.expect(SyntaxKind.Star);
    this.markupExprs(new Set([SyntaxKind.Star, SyntaxKind.End, SyntaxKind.RightBracket, SyntaxKind.Parbreak]));
    this.expect(SyntaxKind.Star);
    this.wrap(m, SyntaxKind.Strong);
  }

  private emph() {
    const m = this.marker();
    this.expect(SyntaxKind.Underscore);
    this.markupExprs(new Set([SyntaxKind.Underscore, SyntaxKind.End, SyntaxKind.RightBracket, SyntaxKind.Parbreak]));
    this.expect(SyntaxKind.Underscore);
    this.wrap(m, SyntaxKind.Emph);
  }

  private heading() {
    const m = this.marker();
    this.expect(SyntaxKind.HeadingMarker);
    while (!this.at(SyntaxKind.End) && !this.at(SyntaxKind.Parbreak) && !this.at(SyntaxKind.Linebreak)) {
      if (this.current === SyntaxKind.Space && this.lexer.hasNewline()) {
        break;
      }
      if (this.at(SyntaxKind.Label)) break;
      this.markupExpr();
    }
    this.wrap(m, SyntaxKind.Heading);
  }

  private listItem() {
    const m = this.marker();
    this.expect(SyntaxKind.ListMarker);
    while (!this.at(SyntaxKind.End) && !this.at(SyntaxKind.Parbreak)) {
      this.markupExpr();
    }
    this.wrap(m, SyntaxKind.ListItem);
  }

  private enumItem() {
    const m = this.marker();
    this.expect(SyntaxKind.EnumMarker);
    while (!this.at(SyntaxKind.End) && !this.at(SyntaxKind.Parbreak)) {
      this.markupExpr();
    }
    this.wrap(m, SyntaxKind.EnumItem);
  }

  private termItem() {
    const m = this.marker();
    this.expect(SyntaxKind.TermMarker);
    while (!this.at(SyntaxKind.Colon) && !this.at(SyntaxKind.End) && !this.at(SyntaxKind.Parbreak)) {
      this.markupExpr();
    }
    if (this.at(SyntaxKind.Colon)) this.eat();

    while (!this.at(SyntaxKind.End) && !this.at(SyntaxKind.Parbreak)) {
      this.markupExpr();
    }
    this.wrap(m, SyntaxKind.TermItem);
  }

  private reference() {
    const m = this.marker();
    this.expect(SyntaxKind.RefMarker);
    if (this.at(SyntaxKind.LeftBracket)) {
      this.eat(); // [
      this.markupExprs(new Set([SyntaxKind.RightBracket]));
      if (this.at(SyntaxKind.RightBracket)) this.eat();
    }
    this.wrap(m, SyntaxKind.Ref);
  }

  private equation() {
    const m = this.marker();
    this.lexer.setMode(SyntaxMode.Math);
    this.eat(); // $

    while (!this.at(SyntaxKind.Dollar) && !this.at(SyntaxKind.End)) {
      this.mathExpr();
    }

    this.expect(SyntaxKind.Dollar);
    this.lexer.setMode(SyntaxMode.Markup);
    this.wrap(m, SyntaxKind.Equation);
  }

  private mathExpr() {
    if (this.at(SyntaxKind.Hash)) {
      this.embeddedCode();
      return;
    }

    if (this.at(SyntaxKind.MathIdent) || this.at(SyntaxKind.MathText)) {
      const m = this.marker();
      this.eat();
      if (this.at(SyntaxKind.LeftParen)) {
        this.mathArgs();
        this.wrap(m, SyntaxKind.FuncCall);
      }
      return;
    }

    this.eat();
  }

  private mathArgs() {
    const m = this.marker();
    this.expect(SyntaxKind.LeftParen);
    while (!this.at(SyntaxKind.RightParen) && !this.at(SyntaxKind.End) && !this.at(SyntaxKind.Dollar)) {
      this.mathExpr();
      if (this.at(SyntaxKind.Comma) || this.at(SyntaxKind.Semicolon)) this.eat();
    }
    this.expect(SyntaxKind.RightParen);
    this.wrap(m, SyntaxKind.Args);
  }

  private embeddedCode() {
    const prevMode = this.lexer.mode;
    const prevStop = this.stopAtNewline;
    this.lexer.setMode(SyntaxMode.Code);
    this.stopAtNewline = true;
    this.eat(); // #

    if (this.at(SyntaxKind.Semicolon)) {
      this.eat();
    } else {
      this.codeExpr();
    }

    this.lexer.setMode(prevMode);
    this.stopAtNewline = prevStop;
  }

  private skipTrivia() {
    while (
      this.at(SyntaxKind.Space) ||
      this.at(SyntaxKind.LineComment) ||
      this.at(SyntaxKind.BlockComment) ||
      this.at(SyntaxKind.Parbreak) ||
      this.at(SyntaxKind.Shebang)
    ) {
      if (
        this.stopAtNewline &&
        (this.at(SyntaxKind.Parbreak) || (this.at(SyntaxKind.Space) && this.lexer.hasNewline()))
      ) {
        break;
      }
      this.eat();
    }
  }

  private codeExpr() {
    this.skipTrivia();
    const m = this.marker();

    if (this.at(SyntaxKind.LeftBrace)) {
      this.codeBlock();
      return;
    }
    if (this.at(SyntaxKind.LeftBracket)) {
      this.contentBlock();
    } else {
      this.codePrimary();
    }

    while (true) {
      this.skipTrivia();
      if (this.at(SyntaxKind.LeftParen)) {
        this.args();
        this.wrap(m, SyntaxKind.FuncCall);
      } else if (this.at(SyntaxKind.LeftBracket)) {
        this.contentBlock();
        this.wrap(m, SyntaxKind.FuncCall);
      } else if (this.at(SyntaxKind.Dot)) {
        this.eat();
        this.skipTrivia();
        this.expect(SyntaxKind.Ident);
        this.wrap(m, SyntaxKind.FieldAccess);
      } else {
        break;
      }
    }
  }

  private codePrimary() {
    switch (this.current) {
      case SyntaxKind.Ident:
      case SyntaxKind.Int:
      case SyntaxKind.Float:
      case SyntaxKind.Str:
      case SyntaxKind.Bool:
      case SyntaxKind.None:
        this.eat();
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
        this.contextual();
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
      case SyntaxKind.LeftParen:
        this.eat();
        while (!this.at(SyntaxKind.RightParen) && !this.at(SyntaxKind.End)) {
          this.codeExpr();
          if (this.at(SyntaxKind.Comma)) this.eat();
          else break;
        }
        this.expect(SyntaxKind.RightParen);
        break;
      default:
        if (
          this.stopAtNewline &&
          (this.at(SyntaxKind.Parbreak) || (this.at(SyntaxKind.Space) && this.lexer.hasNewline()))
        ) {
          return;
        }
        this.unexpected();
    }
  }

  private letBinding() {
    const m = this.marker();
    this.eat(); // let
    this.codeExpr(); // pattern/ident
    this.skipTrivia();
    if (this.at(SyntaxKind.Eq)) {
      this.eat();
      this.codeExpr();
    }
    this.wrap(m, SyntaxKind.LetBinding);
  }

  private setRule() {
    const m = this.marker();
    this.eat(); // set
    this.codeExpr(); // target (call)
    // condition?
    this.skipTrivia();
    if (this.at(SyntaxKind.If)) {
      this.eat();
      this.codeExpr();
    }
    this.wrap(m, SyntaxKind.SetRule);
  }

  private showRule() {
    const m = this.marker();
    this.eat(); // show
    this.skipTrivia();
    if (!this.at(SyntaxKind.Colon)) {
      this.codeExpr(); // selector
    }
    this.skipTrivia();
    if (this.at(SyntaxKind.Colon)) {
      this.eat();
      this.codeExpr(); // transform
    }
    this.wrap(m, SyntaxKind.ShowRule);
  }

  private conditional() {
    const m = this.marker();
    this.eat(); // if
    this.codeExpr(); // cond
    this.skipTrivia();
    if (this.at(SyntaxKind.LeftBracket)) {
      this.contentBlock();
    } else {
      this.codeBlock(); // body
    }
    this.skipTrivia();
    if (this.at(SyntaxKind.Else)) {
      this.eat();
      if (this.at(SyntaxKind.If)) {
        this.conditional(); // else if
      } else if (this.at(SyntaxKind.LeftBracket)) {
        this.contentBlock(); // else [..]
      } else {
        this.codeBlock(); // else {..}
      }
    }
    this.wrap(m, SyntaxKind.Conditional);
  }

  private whileLoop() {
    const m = this.marker();
    this.eat(); // while
    this.codeExpr();
    this.skipTrivia();
    if (this.at(SyntaxKind.LeftBracket)) {
      this.contentBlock();
    } else {
      this.codeBlock();
    }
    this.wrap(m, SyntaxKind.WhileLoop);
  }

  private forLoop() {
    const m = this.marker();
    this.eat(); // for
    this.codeExpr(); // pattern
    this.skipTrivia();
    if (this.at(SyntaxKind.In)) {
      this.eat();
      this.codeExpr();
    }
    this.skipTrivia();
    if (this.at(SyntaxKind.LeftBracket)) {
      this.contentBlock();
    } else {
      this.codeBlock();
    }
    this.wrap(m, SyntaxKind.ForLoop);
  }

  private moduleImport() {
    const m = this.marker();
    this.eat(); // import
    this.codeExpr(); // source

    this.skipTrivia();
    if (this.at(SyntaxKind.As)) {
      this.eat();
      this.skipTrivia();
      this.expect(SyntaxKind.Ident);
    } else if (this.at(SyntaxKind.Colon)) {
      this.eat();
      this.skipTrivia();
      if (this.at(SyntaxKind.Star)) {
        this.eat();
      } else {
        while (!this.at(SyntaxKind.End) && !this.at(SyntaxKind.Semicolon)) {
          this.skipTrivia();
          this.expect(SyntaxKind.Ident);
          this.skipTrivia();
          if (this.at(SyntaxKind.Comma)) this.eat();
          else break;
        }
      }
    }
    this.wrap(m, SyntaxKind.ModuleImport);
  }

  private moduleInclude() {
    const m = this.marker();
    this.eat(); // include
    this.codeExpr();
    this.wrap(m, SyntaxKind.ModuleInclude);
  }

  private contextual() {
    const m = this.marker();
    this.eat(); // context
    this.codeExpr();
    this.wrap(m, SyntaxKind.Contextual);
  }

  private breakStmt() {
    const m = this.marker();
    this.eat(); // break
    this.wrap(m, SyntaxKind.LoopBreak);
  }

  private continueStmt() {
    const m = this.marker();
    this.eat(); // continue
    this.wrap(m, SyntaxKind.LoopContinue);
  }

  private returnStmt() {
    const m = this.marker();
    this.eat(); // return
    this.wrap(m, SyntaxKind.FuncReturn);
  }

  private codeBlock() {
    const m = this.marker();
    const prevStop = this.stopAtNewline;
    this.stopAtNewline = false;
    this.expect(SyntaxKind.LeftBrace);
    while (!this.at(SyntaxKind.RightBrace) && !this.at(SyntaxKind.End)) {
      this.codeExpr();
      if (this.at(SyntaxKind.Semicolon)) this.eat();
    }
    this.expect(SyntaxKind.RightBrace);
    this.stopAtNewline = prevStop;
    this.wrap(m, SyntaxKind.CodeBlock);
  }

  private contentBlock() {
    const m = this.marker();
    const prevMode = this.lexer.mode;
    const prevStop = this.stopAtNewline;
    this.stopAtNewline = false;
    this.lexer.setMode(SyntaxMode.Markup);
    this.expect(SyntaxKind.LeftBracket);

    while (!this.at(SyntaxKind.RightBracket) && !this.at(SyntaxKind.End)) {
      this.markupExpr();
    }

    this.expect(SyntaxKind.RightBracket);
    this.lexer.setMode(prevMode);
    this.stopAtNewline = prevStop;
    this.wrap(m, SyntaxKind.ContentBlock);
  }

  private args() {
    const m = this.marker();
    const prevStop = this.stopAtNewline;
    this.stopAtNewline = false;
    this.expect(SyntaxKind.LeftParen);
    while (!this.at(SyntaxKind.RightParen) && !this.at(SyntaxKind.End)) {
      this.codeExpr();
      if (this.at(SyntaxKind.Comma)) this.eat();
    }
    this.expect(SyntaxKind.RightParen);
    this.stopAtNewline = prevStop;
    this.wrap(m, SyntaxKind.Args);
  }
}
