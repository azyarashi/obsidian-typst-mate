import type { SyntaxMode } from '.';

export enum SyntaxKind {
  // Special
  End = 'End',
  Error = 'Error',

  // Trivia
  Shebang = 'Shebang', // Trivia
  LineComment = 'LineComment', // Trivia
  BlockComment = 'BlockComment', // Trivia

  // Markup
  Markup = 'Markup',
  Text = 'Text',
  Space = 'Space', // Trivia
  Linebreak = 'Linebreak',
  Parbreak = 'Parbreak', // Trivia
  Escape = 'Escape',
  Shorthand = 'Shorthand',
  SmartQuote = 'SmartQuote',
  Strong = 'Strong',
  Emph = 'Emph',
  Raw = 'Raw',
  RawLang = 'RawLang',
  RawTrimmed = 'RawTrimmed',
  RawDelim = 'RawDelim',
  Link = 'Link',
  Label = 'Label',
  Ref = 'Ref',
  RefMarker = 'RefMarker',
  Heading = 'Heading',
  HeadingMarker = 'HeadingMarker',
  ListItem = 'ListItem',
  ListMarker = 'ListMarker',
  EnumItem = 'EnumItem',
  EnumMarker = 'EnumMarker',
  TermItem = 'TermItem',
  TermMarker = 'TermMarker',
  Equation = 'Equation',

  // Math
  Math = 'Math',
  MathText = 'MathText',
  MathIdent = 'MathIdent',
  MathShorthand = 'MathShorthand',
  MathAlignPoint = 'MathAlignPoint',
  MathDelimited = 'MathDelimited',
  MathAttach = 'MathAttach',
  MathPrimes = 'MathPrimes',
  MathFrac = 'MathFrac',
  MathRoot = 'MathRoot',

  // Symbols / Punctuation
  Hash = 'Hash',
  LeftBrace = 'LeftBrace',
  RightBrace = 'RightBrace',
  LeftBracket = 'LeftBracket',
  RightBracket = 'RightBracket',
  LeftParen = 'LeftParen',
  RightParen = 'RightParen',
  Comma = 'Comma',
  Semicolon = 'Semicolon',
  Colon = 'Colon',
  Star = 'Star',
  Underscore = 'Underscore',
  Dollar = 'Dollar',
  Plus = 'Plus',
  Minus = 'Minus',
  Slash = 'Slash',
  Hat = 'Hat',
  Prime = 'Prime',
  Dot = 'Dot',
  Eq = 'Eq',
  EqEq = 'EqEq',
  ExclEq = 'ExclEq',
  Lt = 'Lt',
  LtEq = 'LtEq',
  Gt = 'Gt',
  GtEq = 'GtEq',
  PlusEq = 'PlusEq',
  HyphEq = 'HyphEq',
  StarEq = 'StarEq',
  SlashEq = 'SlashEq',
  Dots = 'Dots',
  Arrow = 'Arrow',
  Root = 'Root',
  Bang = 'Bang',

  // Keywords
  Not = 'Not',
  And = 'And',
  Or = 'Or',
  None = 'None',
  Auto = 'Auto',
  Let = 'Let',
  Set = 'Set',
  Show = 'Show',
  Context = 'Context',
  If = 'If',
  Else = 'Else',
  For = 'For',
  In = 'In',
  While = 'While',
  Break = 'Break',
  Continue = 'Continue',
  Return = 'Return',
  Import = 'Import',
  Include = 'Include',
  As = 'As',

  // Code
  Code = 'Code',
  Ident = 'Ident',
  Bool = 'Bool',
  Int = 'Int',
  Float = 'Float',
  Numeric = 'Numeric',
  Str = 'Str',
  CodeBlock = 'CodeBlock',
  ContentBlock = 'ContentBlock',
  Parenthesized = 'Parenthesized',
  Array = 'Array',
  Dict = 'Dict',
  Named = 'Named',
  Keyed = 'Keyed',
  Unary = 'Unary',
  Binary = 'Binary',
  FieldAccess = 'FieldAccess',
  FuncCall = 'FuncCall',
  Args = 'Args',
  Spread = 'Spread',
  Closure = 'Closure',
  Params = 'Params',
  LetBinding = 'LetBinding',
  SetRule = 'SetRule',
  ShowRule = 'ShowRule',
  Contextual = 'Contextual',
  Conditional = 'Conditional',
  WhileLoop = 'WhileLoop',
  ForLoop = 'ForLoop',
  ModuleImport = 'ModuleImport',
  ImportItems = 'ImportItems',
  ImportItemPath = 'ImportItemPath',
  RenamedImportItem = 'RenamedImportItem',
  ModuleInclude = 'ModuleInclude',
  LoopBreak = 'LoopBreak',
  LoopContinue = 'LoopContinue',
  FuncReturn = 'FuncReturn',
  Destructuring = 'Destructuring',
  DestructAssignment = 'DestructAssignment',
}

export interface SyntaxToken {
  kind: SyntaxKind;
  from: number;
  to: number;
  text: string;
  mode?: SyntaxMode;
  parent?: SyntaxNode;
}

export interface SyntaxNode {
  kind: SyntaxKind;
  from: number;
  to: number;
  children: (SyntaxNode | SyntaxToken)[];
  parent?: SyntaxNode;
  errors?: TypstSyntaxError[];
  mode?: SyntaxMode;
}

export interface TypstSyntaxError {
  message: string;
  from: number;
  to: number;
  hints: string[];
}

export const isBracket = (kind: SyntaxKind): boolean => {
  switch (kind) {
    case SyntaxKind.LeftParen:
    case SyntaxKind.RightParen:
    case SyntaxKind.LeftBracket:
    case SyntaxKind.RightBracket:
    case SyntaxKind.LeftBrace:
    case SyntaxKind.RightBrace:
      return true;
    default:
      return false;
  }
};

export const isOpenBracket = (kind: SyntaxKind): boolean => {
  switch (kind) {
    case SyntaxKind.LeftParen:
    case SyntaxKind.LeftBracket:
    case SyntaxKind.LeftBrace:
      return true;
    default:
      return false;
  }
};

export const getCloseKind = (kind: SyntaxKind): SyntaxKind | undefined => {
  switch (kind) {
    case SyntaxKind.LeftParen:
      return SyntaxKind.RightParen;
    case SyntaxKind.LeftBracket:
      return SyntaxKind.RightBracket;
    case SyntaxKind.LeftBrace:
      return SyntaxKind.RightBrace;
  }
  return undefined;
};

export const isKeywordText = (text: string) => {
  const keywords = [
    'not',
    'and',
    'or',
    'none',
    'auto',
    'let',
    'set',
    'show',
    'context',
    'if',
    'else',
    'for',
    'in',
    'while',
    'break',
    'continue',
    'return',
    'import',
    'include',
    'as',
  ];
  return keywords.includes(text);
};

export const isKeyword = (k: SyntaxKind) => {
  switch (k) {
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
      return true;
  }
  return false;
};
