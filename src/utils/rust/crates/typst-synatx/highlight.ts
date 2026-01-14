import { SyntaxKind, type SyntaxNode, type SyntaxToken } from '.';

// --- ヘルパー ---

export const isToken = (node: SyntaxNode | SyntaxToken): node is SyntaxToken => {
  return 'text' in node;
};

// --- ハイライトロジック ---

export const highlight = (
  node: SyntaxNode | SyntaxToken,
  parent: SyntaxNode | null,
  index: number,
  siblings: (SyntaxNode | SyntaxToken)[],
): CSSClass | null => {
  const k = node.kind;

  switch (k) {
    case SyntaxKind.Markup: {
      if (parent?.kind === SyntaxKind.TermItem && siblings[index + 1]?.kind === SyntaxKind.Colon)
        return CSSClass.ListTerm;
      return null;
    }
    case SyntaxKind.Text:
      return CSSClass.Text; // 置き換え
    case SyntaxKind.Space:
      return null;
    case SyntaxKind.Linebreak:
      return CSSClass.Escape;
    case SyntaxKind.Parbreak:
      return null;
    case SyntaxKind.Escape:
      return CSSClass.Escape;
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
      return CSSClass.Ref;
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
      return null; // 帰る
    case SyntaxKind.MathIdent:
      return highlightIdent(node, parent, index, siblings);
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
      return highlightHash(node, parent, index, siblings);
    case SyntaxKind.LeftBrace:
    case SyntaxKind.RightBrace:
      return CSSClass.Brace;
    case SyntaxKind.LeftBracket:
    case SyntaxKind.RightBracket:
      return CSSClass.Bracket;
    case SyntaxKind.LeftParen:
    case SyntaxKind.RightParen:
      return CSSClass.Paren;
    case SyntaxKind.Comma:
    case SyntaxKind.Semicolon:
    case SyntaxKind.Colon:
      return CSSClass.Punctuation;
    case SyntaxKind.Star:
      return parent?.kind === SyntaxKind.Strong ? null : CSSClass.Operator;
    case SyntaxKind.Underscore:
      return parent?.kind === SyntaxKind.MathAttach ? CSSClass.MathOperator : null;
    case SyntaxKind.Dollar:
      return CSSClass.MathDelimiter;
    case SyntaxKind.Plus:
    case SyntaxKind.Minus:
      return CSSClass.Operator;
    case SyntaxKind.Slash:
      return parent?.kind === SyntaxKind.MathFrac ? CSSClass.MathOperator : CSSClass.Operator;
    case SyntaxKind.Hat:
    case SyntaxKind.Dot:
      return CSSClass.Punctuation;
    case SyntaxKind.Prime:
      return CSSClass.MathOperator;

    case SyntaxKind.Eq:
      return parent?.kind === SyntaxKind.Heading ? null : CSSClass.Operator;
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
      return highlightIdent(node, parent, index, siblings);
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

  return CSSClass.Error;
};

function highlightIdent(
  node: SyntaxNode | SyntaxToken,
  _parent: SyntaxNode | null,
  _index: number,
  _siblings: (SyntaxNode | SyntaxToken)[],
): CSSClass | null {
  const nextLeaf = getNextLeaf(node);

  if (nextLeaf && node.to === nextLeaf.from) {
    const nextKind = nextLeaf.kind;
    const nextParentKind = nextLeaf.parent?.kind;
    if (
      (nextKind === SyntaxKind.LeftParen &&
        (nextParentKind === SyntaxKind.Args || nextParentKind === SyntaxKind.Params)) ||
      (nextKind === SyntaxKind.LeftBracket && nextParentKind === SyntaxKind.ContentBlock)
    ) {
      return CSSClass.Function;
    }
  }

  if (node.kind === SyntaxKind.MathIdent) {
    return CSSClass.Interpolated;
  }

  let ancestor: SyntaxNode | SyntaxToken = node;
  while (ancestor.parent && ancestor.parent.kind === SyntaxKind.FieldAccess) {
    ancestor = ancestor.parent;
  }

  if (ancestor.parent?.kind === SyntaxKind.ShowRule) {
    const prevLeaf = getPrevLeaf(node);
    if ((nextLeaf && nextLeaf.kind === SyntaxKind.Colon) || (prevLeaf && prevLeaf.kind === SyntaxKind.Colon)) {
      return CSSClass.Function;
    }
  }

  const prevOfAncestor = getPrevLeaf(ancestor);
  if (prevOfAncestor && prevOfAncestor.kind === SyntaxKind.Hash) {
    return CSSClass.Interpolated;
  }

  const prev = getPrevLeaf(node);
  if (prev && prev.kind === SyntaxKind.Dot) {
    const prevPrev = getPrevLeaf(prev);
    if (prevPrev && isIdent(prevPrev)) {
      if (!prevPrev.parent) return null;
      const ppParent = prevPrev.parent;
      const ppIndex = ppParent.children.indexOf(prevPrev as any);
      return highlightIdent(prevPrev, ppParent, ppIndex, ppParent.children);
    }
  }

  return null;
}

function highlightHash(
  _node: SyntaxNode | SyntaxToken,
  _parent: SyntaxNode | null,
  index: number,
  siblings: (SyntaxNode | SyntaxToken)[],
): CSSClass | null {
  const next = index + 1 < siblings.length ? siblings[index + 1] : null;

  if (!next) return null;

  if (!isHashExpression(next.kind)) {
    return null;
  }

  const leaf = getLeftmostLeaf(next);
  if (!leaf.parent) return null;
  const leafIndex = leaf.parent.children.indexOf(leaf as any);
  return highlight(leaf, leaf.parent, leafIndex, leaf.parent.children);
}

function isIdent(node: SyntaxNode | SyntaxToken): boolean {
  return node.kind === SyntaxKind.Ident || node.kind === SyntaxKind.MathIdent;
}

function isHashExpression(kind: SyntaxKind): boolean {
  switch (kind) {
    case SyntaxKind.Ident:
    case SyntaxKind.Bool:
    case SyntaxKind.Int:
    case SyntaxKind.Float:
    case SyntaxKind.Numeric:
    case SyntaxKind.Str:
    case SyntaxKind.CodeBlock:
    case SyntaxKind.ContentBlock:
    case SyntaxKind.Parenthesized:
    case SyntaxKind.Array:
    case SyntaxKind.Dict:
    case SyntaxKind.Unary:
    case SyntaxKind.Binary:
    case SyntaxKind.FieldAccess:
    case SyntaxKind.FuncCall:
    case SyntaxKind.Closure:
    case SyntaxKind.Let:
    case SyntaxKind.Set:
    case SyntaxKind.Show:
    case SyntaxKind.Context:
    case SyntaxKind.If:
    case SyntaxKind.While:
    case SyntaxKind.For:
    case SyntaxKind.Import:
    case SyntaxKind.Include:
    case SyntaxKind.Break:
    case SyntaxKind.Continue:
    case SyntaxKind.Return:
    case SyntaxKind.MathIdent:
    case SyntaxKind.LetBinding:
    case SyntaxKind.SetRule:
    case SyntaxKind.ShowRule:
    case SyntaxKind.Contextual:
    case SyntaxKind.Conditional:
    case SyntaxKind.WhileLoop:
    case SyntaxKind.ForLoop:
    case SyntaxKind.ModuleImport:
    case SyntaxKind.ModuleInclude:
    case SyntaxKind.LoopBreak:
    case SyntaxKind.LoopContinue:
    case SyntaxKind.FuncReturn:
    case SyntaxKind.Destructuring:
    case SyntaxKind.DestructAssignment:
      return true;
    default:
      return false;
  }
}

function getLeftmostLeaf(node: SyntaxNode | SyntaxToken): SyntaxNode | SyntaxToken {
  if (isToken(node)) return node;
  if (node.children && node.children.length > 0) {
    return getLeftmostLeaf(node.children[0]!);
  }
  return node;
}

function getRightmostLeaf(node: SyntaxNode | SyntaxToken): SyntaxNode | SyntaxToken {
  if (isToken(node)) return node;
  if (node.children && node.children.length > 0) {
    return getRightmostLeaf(node.children[node.children.length - 1]!);
  }
  return node;
}

function getNextLeaf(node: SyntaxNode | SyntaxToken): SyntaxNode | SyntaxToken | null {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    const index = parent.children.indexOf(current as any);
    if (index !== -1 && index + 1 < parent.children.length) {
      return getLeftmostLeaf(parent.children[index + 1]!);
    }
    current = parent;
  }
  return null;
}

function getPrevLeaf(node: SyntaxNode | SyntaxToken): SyntaxNode | SyntaxToken | null {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    const index = parent.children.indexOf(current as any);
    if (index > 0) {
      return getRightmostLeaf(parent.children[index - 1]!);
    }
    current = parent;
  }
  return null;
}

// https://github.com/typst/typst/blob/v0.14.2/crates/typst-syntax/src/highlight.rs#L106
export enum CSSClass {
  Comment = 'typ-comment',
  Punctuation = 'typ-punctuation',
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

  Text = 'typ-text',
  BracketEnclosing = 'typstmate-bracket-enclosing',
  Brace = 'typstmate-bracket-brace',
  Bracket = 'typstmate-bracket-bracket',
  Paren = 'typstmate-bracket-paren',
}
