import { SyntaxKind } from './kind';
import type { LinkedNode } from './node';

export enum CSSClass {
  Comment = 'typ-comment',
  Punctuation = 'typ-punct',
  Escape = 'typ-escape',
  Strong = 'typ-strong',
  Emph = 'typ-emph',
  Link = 'typ-link',
  Raw = 'typ-raw',
  Label = 'typ-label',
  Ref = 'typ-ref',
  Heading = 'typ-heading',
  ListMarker = 'typ-marker',
  ListTerm = 'typ-term',
  MathDelimiter = 'typ-math-delim',
  MathOperator = 'typ-math-op',
  Keyword = 'typ-key',
  Operator = 'typ-op',
  Number = 'typ-num',
  String = 'typ-str',
  Function = 'typ-func',
  Interpolated = 'typ-pol',
  Error = 'typ-error',
  // 追加
  Text = 'typ-text',
}

export function highlight(node: LinkedNode): CSSClass | null {
  switch (node.kind()) {
    case SyntaxKind.Markup:
      if (node.parentKind() === SyntaxKind.TermItem && node.nextSiblingKind() === SyntaxKind.Colon)
        return CSSClass.ListTerm;
      return null;
    case SyntaxKind.Text:
      return CSSClass.Text; // 追加
    case SyntaxKind.Space:
      return null;
    case SyntaxKind.Linebreak:
      return CSSClass.Escape;
    case SyntaxKind.Parbreak:
      return null;
    case SyntaxKind.Escape:
    case SyntaxKind.Shorthand:
      return CSSClass.Escape;
    case SyntaxKind.SmartQuote:
      return null;
    case SyntaxKind.Strong:
      return CSSClass.Strong;
    case SyntaxKind.Emph:
      return CSSClass.Emph;
    case SyntaxKind.Raw:
      return CSSClass.Raw;
    case SyntaxKind.RawLang:
    case SyntaxKind.RawTrimmed:
    case SyntaxKind.RawDelim:
      return null;
    case SyntaxKind.Link:
      return CSSClass.Link;
    case SyntaxKind.Label:
      return CSSClass.Label;
    case SyntaxKind.Ref:
      return CSSClass.Ref;
    case SyntaxKind.RefMarker:
      return null;
    case SyntaxKind.Heading:
      return CSSClass.Heading;
    case SyntaxKind.HeadingMarker:
      return null;
    case SyntaxKind.ListItem:
      return null;
    case SyntaxKind.ListMarker:
      return CSSClass.ListMarker;
    case SyntaxKind.EnumItem:
      return null;
    case SyntaxKind.EnumMarker:
      return CSSClass.ListMarker;
    case SyntaxKind.TermItem:
      return null;
    case SyntaxKind.TermMarker:
      return CSSClass.ListMarker;
    case SyntaxKind.Equation:
      return null;

    case SyntaxKind.Math:
      return null;
    case SyntaxKind.MathText:
      return CSSClass.Text;
    case SyntaxKind.MathIdent:
      return highlightIdent(node);
    case SyntaxKind.MathShorthand:
      return CSSClass.Escape;
    case SyntaxKind.MathAlignPoint:
      return CSSClass.MathOperator;
    case SyntaxKind.MathDelimited:
    case SyntaxKind.MathAttach:
    case SyntaxKind.MathFrac:
    case SyntaxKind.MathRoot:
    case SyntaxKind.MathPrimes:
      return null;

    case SyntaxKind.Hash:
      return highlightHash(node);
    case SyntaxKind.LeftBrace:
    case SyntaxKind.RightBrace:
    case SyntaxKind.LeftBracket:
    case SyntaxKind.RightBracket:
    case SyntaxKind.LeftParen:
    case SyntaxKind.RightParen:
    case SyntaxKind.Comma:
    case SyntaxKind.Semicolon:
    case SyntaxKind.Colon:
      return CSSClass.Punctuation;
    case SyntaxKind.Star:
      return node.parentKind() === SyntaxKind.Strong ? null : CSSClass.Operator;
    case SyntaxKind.Underscore:
      return node.parentKind() === SyntaxKind.MathAttach ? CSSClass.MathOperator : null;
    case SyntaxKind.Dollar:
      return CSSClass.MathDelimiter;
    case SyntaxKind.Plus:
    case SyntaxKind.Minus:
      return CSSClass.Operator;
    case SyntaxKind.Slash:
      return node.parentKind() === SyntaxKind.MathFrac ? CSSClass.MathOperator : CSSClass.Operator;
    case SyntaxKind.Hat:
    case SyntaxKind.Prime:
      return CSSClass.MathOperator;
    case SyntaxKind.Dot:
      return CSSClass.Punctuation;
    case SyntaxKind.Eq:
      return node.parentKind() === SyntaxKind.Heading ? null : CSSClass.Operator;
    case SyntaxKind.EqEq:
    case SyntaxKind.ExclEq:
    case SyntaxKind.Lt:
    case SyntaxKind.LtEq:
    case SyntaxKind.Gt:
    case SyntaxKind.GtEq:
    case SyntaxKind.PlusEq:
    case SyntaxKind.HyphEq:
    case SyntaxKind.StarEq:
    case SyntaxKind.SlashEq:
    case SyntaxKind.Dots:
    case SyntaxKind.Arrow:
      return CSSClass.Operator;
    case SyntaxKind.Root:
      return CSSClass.MathOperator;

    case SyntaxKind.Not:
    case SyntaxKind.And:
    case SyntaxKind.Or:
    case SyntaxKind.None:
    case SyntaxKind.Auto:
    case SyntaxKind.Let:
    case SyntaxKind.Set:
    case SyntaxKind.Show:
    case SyntaxKind.Context:
    case SyntaxKind.If:
    case SyntaxKind.Else:
    case SyntaxKind.For:
    case SyntaxKind.In:
    case SyntaxKind.While:
    case SyntaxKind.Break:
    case SyntaxKind.Continue:
    case SyntaxKind.Return:
    case SyntaxKind.Import:
    case SyntaxKind.Include:
    case SyntaxKind.As:
      return CSSClass.Keyword;

    case SyntaxKind.Code:
      return null;
    case SyntaxKind.Ident:
      return highlightIdent(node);
    case SyntaxKind.Bool:
      return CSSClass.Keyword;
    case SyntaxKind.Int:
    case SyntaxKind.Float:
    case SyntaxKind.Numeric:
      return CSSClass.Number;
    case SyntaxKind.Str:
      return CSSClass.String;
    case SyntaxKind.CodeBlock:
    case SyntaxKind.ContentBlock:
    case SyntaxKind.Parenthesized:
    case SyntaxKind.Array:
    case SyntaxKind.Dict:
    case SyntaxKind.Named:
    case SyntaxKind.Keyed:
    case SyntaxKind.Unary:
    case SyntaxKind.Binary:
    case SyntaxKind.FieldAccess:
    case SyntaxKind.FuncCall:
    case SyntaxKind.Args:
    case SyntaxKind.Spread:
    case SyntaxKind.Closure:
    case SyntaxKind.Params:
    case SyntaxKind.LetBinding:
    case SyntaxKind.SetRule:
    case SyntaxKind.ShowRule:
    case SyntaxKind.Contextual:
    case SyntaxKind.Conditional:
    case SyntaxKind.WhileLoop:
    case SyntaxKind.ForLoop:
    case SyntaxKind.ModuleImport:
    case SyntaxKind.ImportItems:
    case SyntaxKind.ImportItemPath:
    case SyntaxKind.RenamedImportItem:
    case SyntaxKind.ModuleInclude:
    case SyntaxKind.LoopBreak:
    case SyntaxKind.LoopContinue:
    case SyntaxKind.FuncReturn:
    case SyntaxKind.Destructuring:
    case SyntaxKind.DestructAssignment:
      return null;

    case SyntaxKind.Shebang:
    case SyntaxKind.LineComment:
    case SyntaxKind.BlockComment:
      return CSSClass.Comment;
    case SyntaxKind.Error:
      return CSSClass.Error;
    case SyntaxKind.End:
      return null;
  }
}

function highlightIdent(node: LinkedNode): CSSClass | null {
  const nextLeaf = node.nextLeaf();
  if (
    nextLeaf &&
    node.range().end === nextLeaf.offset &&
    ((nextLeaf.kind() === SyntaxKind.LeftParen &&
      (nextLeaf.parentKind() === SyntaxKind.Args || nextLeaf.parentKind() === SyntaxKind.Params)) ||
      (nextLeaf.kind() === SyntaxKind.LeftBracket && nextLeaf.parentKind() === SyntaxKind.ContentBlock))
  )
    return CSSClass.Function;

  if (node.kind() === SyntaxKind.MathIdent) return CSSClass.Interpolated;

  let ancestor: LinkedNode | null = node;
  while (ancestor !== null && ancestor.parentKind() === SyntaxKind.FieldAccess) ancestor = ancestor.parent ?? null;
  if (!ancestor) return null;

  if (
    ancestor.parentKind() === SyntaxKind.ShowRule &&
    (nextLeaf?.kind() === SyntaxKind.Colon || node.prevLeaf()?.kind() === SyntaxKind.Colon)
  )
    return CSSClass.Function;

  if (ancestor.prevLeaf()?.kind() === SyntaxKind.Hash) return CSSClass.Interpolated;

  const prev = node.prevLeaf();
  if (prev && prev.kind() === SyntaxKind.Dot) {
    const prevPrev = prev.prevLeaf();
    if (prevPrev && isIdent(prevPrev)) return highlightIdent(prevPrev);
  }

  return null;
}

// TODO
function highlightHash(node: LinkedNode): CSSClass | null {
  const next = node.nextSibling();
  if (!next) return null;

  const kind = next.kind();
  const isExpr = !SyntaxKind.isTrivia(kind) && kind !== SyntaxKind.Error && kind !== SyntaxKind.End;
  if (!isExpr) return null;

  const leftmost = next.leftmostLeaf();
  if (!leftmost) return null;
  return highlight(leftmost);
}

function isIdent(node: LinkedNode): boolean {
  return node.kind() === SyntaxKind.Ident || node.kind() === SyntaxKind.MathIdent;
}
