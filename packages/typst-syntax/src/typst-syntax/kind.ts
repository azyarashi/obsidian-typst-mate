export enum SyntaxKind {
  /// The end of token stream.
  End = 0,
  /// An invalid sequence of characters.
  Error,

  /// A shebang: `#! ...`
  Shebang,
  /// A line comment: `// ...`.
  LineComment,
  /// A block comment: `/* ... */`.
  BlockComment,

  /// The contents of a file or content block.
  Markup,
  /// Plain text without markup.
  Text,
  /// Whitespace. Contains at most one newline in markup, as more indicate a
  /// paragraph break.
  Space,
  /// A forced line break: `\`.
  Linebreak,
  /// A paragraph break, indicated by one or multiple blank lines.
  Parbreak,
  /// An escape sequence: `\#`, `\u{1F5FA}`.
  Escape,
  /// A shorthand for a unicode codepoint. For example, `~` for non-breaking
  /// space or `-?` for a soft hyphen.
  Shorthand,
  /// A smart quote: `'` or `"`.
  SmartQuote,
  /// Strong content: `*Strong*`.
  Strong,
  /// Emphasized content: `_Emphasized_`.
  Emph,
  /// Raw text with optional syntax highlighting: `` `...` ``.
  Raw,
  /// A language tag at the start of raw text: ``typ ``.
  RawLang,
  /// A raw delimiter consisting of 1 or 3+ backticks: `` ` ``.
  RawDelim,
  /// A sequence of whitespace to ignore in a raw text: `    `.
  RawTrimmed,
  /// A hyperlink: `https://typst.org`.
  Link,
  /// A label: `<intro>`.
  Label,
  /// A reference: `@target`, `@target[..]`.
  Ref,
  /// Introduces a reference: `@target`.
  RefMarker,
  /// A section heading: `= Introduction`.
  Heading,
  /// Introduces a section heading: `=`, `==`, ...
  HeadingMarker,
  /// An item in a bullet list: `- ...`.
  ListItem,
  /// Introduces a list item: `-`.
  ListMarker,
  /// An item in an enumeration (numbered list): `+ ...` or `1. ...`.
  EnumItem,
  /// Introduces an enumeration item: `+`, `1.`.
  EnumMarker,
  /// An item in a term list: `/ Term: Details`.
  TermItem,
  /// Introduces a term item: `/`.
  TermMarker,
  /// A mathematical equation: `$x$`, `$ x^2 $`.
  Equation,

  /// The contents of a mathematical equation: `x^2 + 1`.
  Math,
  /// A lone text fragment in math: `x`, `25`, `3.1415`, `=`, `|`, `[`.
  MathText,
  /// An identifier in math: `pi`.
  MathIdent,
  /// A shorthand for a unicode codepoint in math: `a <= b`.
  MathShorthand,
  /// An alignment point in math: `&`.
  MathAlignPoint,
  /// Matched delimiters in math: `[x + y]`.
  MathDelimited,
  /// A base with optional attachments in math: `a_1^2`.
  MathAttach,
  /// Grouped primes in math: `a'''`.
  MathPrimes,
  /// A fraction in math: `x/2`.
  MathFrac,
  /// A root in math: `√x`, `∛x` or `∜x`.
  MathRoot,

  /// A hash that switches into code mode: `#`.
  Hash,
  /// A left curly brace, starting a code block: `{`.
  LeftBrace,
  /// A right curly brace, terminating a code block: `}`.
  RightBrace,
  /// A left square bracket, starting a content block: `[`.
  LeftBracket,
  /// A right square bracket, terminating a content block: `]`.
  RightBracket, // wait, skipping this
  /// A left round parenthesis: `(`.
  LeftParen,
  /// A right round parenthesis, terminating a grouped expression...
  RightParen,
  /// A comma separator in a sequence: `,`.
  Comma,
  /// A semicolon terminating an expression: `;`.
  Semicolon,
  /// A colon between name/key and value: `:`.
  Colon,
  /// The strong text toggle, multiplication operator, and wildcard import
  /// symbol: `*`.
  Star,
  /// Toggles emphasized text and indicates a subscript in math: `_`.
  Underscore,
  /// Starts and ends a mathematical equation: `$`.
  Dollar,
  /// The unary plus and binary addition operator: `+`.
  Plus,
  /// The unary negation and binary subtraction operator: `-`.
  Minus,
  /// The division operator and fraction operator in math: `/`.
  Slash,
  /// The superscript operator in math: `^`.
  Hat,
  /// The prime in math: `'`.
  Prime,
  /// The field access and method call operator: `.`.
  Dot,
  /// The assignment operator: `=`.
  Eq,
  /// The equality operator: `==`.
  EqEq,
  /// The inequality operator: `!=`.
  ExclEq,
  /// The less-than operator: `<`.
  Lt,
  /// The less-than or equal operator: `<=`.
  LtEq,
  /// The greater-than operator: `>`.
  Gt,
  /// The greater-than or equal operator: `>=`.
  GtEq,
  /// The add-assign operator: `+=`.
  PlusEq,
  /// The subtract-assign operator: `-=`.
  HyphEq,
  /// The multiply-assign operator: `*=`.
  StarEq,
  /// The divide-assign operator: `/=`.
  SlashEq,
  /// Indicates a spread or sink: `..`.
  Dots,
  /// An arrow between a closure's parameters and body: `=>`.
  Arrow,
  /// A root: `√`, `∛` or `∜`.
  Root,

  /// The `not` operator.
  Not,
  /// The `and` operator.
  And,
  /// The `or` operator.
  Or,
  /// The `none` literal.
  None,
  /// The `auto` literal.
  Auto,
  /// The `let` keyword.
  Let,
  /// The `set` keyword.
  Set,
  /// The `show` keyword.
  Show,
  /// The `context` keyword.
  Context,
  /// The `if` keyword.
  If,
  /// The `else` keyword.
  Else,
  /// The `for` keyword.
  For,
  /// The `in` keyword.
  In,
  /// The `while` keyword.
  While,
  /// The `break` keyword.
  Break,
  /// The `continue` keyword.
  Continue,
  /// The `return` keyword.
  Return,
  /// The `import` keyword.
  Import,
  /// The `include` keyword.
  Include,
  /// The `as` keyword.
  As,

  /// The contents of a code block.
  Code,
  /// An identifier: `it`.
  Ident,
  /// A boolean: `true`, `false`.
  Bool,
  /// An integer: `120`.
  Int,
  /// A floating-point number: `1.2`, `10e-4`.
  Float,
  /// A numeric value with a unit: `12pt`, `3cm`, `2em`, `90deg`, `50%`.
  Numeric,
  /// A quoted string: `"..."`.
  Str,
  /// A code block: `{ let x = 1; x + 2 }`.
  CodeBlock,
  /// A content block: `[*Hi* there!]`.
  ContentBlock,
  /// A grouped expression: `(1 + 2)`.
  Parenthesized,
  /// An array: `(1, "hi", 12cm)`.
  Array,
  /// A dictionary: `(thickness: 3pt, dash: "solid")`.
  Dict,
  /// A named pair: `thickness: 3pt`.
  Named,
  /// A keyed pair: `"spacy key": true`.
  Keyed,
  /// A unary operation: `-x`.
  Unary,
  /// A binary operation: `a + b`.
  Binary,
  /// A field access: `properties.age`.
  FieldAccess,
  /// An invocation of a function or method: `f(x, y)`.
  FuncCall,
  /// A function call's argument list: `(12pt, y)`.
  Args,
  /// Spread arguments or an argument sink: `..x`.
  Spread,
  /// A closure: `(x, y) => z`.
  Closure,
  /// A closure's parameters: `(x, y)`.
  Params,
  /// A let binding: `let x = 1`.
  LetBinding,
  /// A set rule: `set text(...)`.
  SetRule,
  /// A show rule: `show heading: it => emph(it.body)`.
  ShowRule,
  /// A contextual expression: `context text.lang`.
  Contextual,
  /// An if-else conditional: `if x { y } else { z }`.
  Conditional,
  /// A while loop: `while x { y }`.
  WhileLoop,
  /// A for loop: `for x in y { z }`.
  ForLoop,
  /// A module import: `import "utils.typ": a, b, c`.
  ModuleImport,
  /// Items to import from a module: `a, b, c`.
  ImportItems,
  /// A path to an imported name from a submodule: `a.b.c`.
  ImportItemPath,
  /// A renamed import item: `a as d`.
  RenamedImportItem,
  /// A module include: `include "chapter1.typ"`.
  ModuleInclude,
  /// A break from a loop: `break`.
  LoopBreak,
  /// A continue in a loop: `continue`.
  LoopContinue,
  /// A return from a function: `return`, `return x + 1`.
  FuncReturn,
  /// A destructuring pattern: `(x, _, ..y)`.
  Destructuring,
  /// A destructuring assignment expression: `(x, y) = (1, 2)`.
  DestructAssignment,
}

export namespace SyntaxKind {
  export function isGrouping(kind: SyntaxKind): boolean {
    switch (kind) {
      case SyntaxKind.LeftBracket:
      case SyntaxKind.LeftBrace:
      case SyntaxKind.LeftParen:
      case SyntaxKind.RightBracket:
      case SyntaxKind.RightBrace:
      case SyntaxKind.RightParen:
        return true;
      default:
        return false;
    }
  }

  export function isTerminator(kind: SyntaxKind): boolean {
    switch (kind) {
      case SyntaxKind.End:
      case SyntaxKind.Semicolon:
      case SyntaxKind.RightBrace:
      case SyntaxKind.RightParen:
      case SyntaxKind.RightBracket:
        return true;
      default:
        return false;
    }
  }

  export function isBlock(kind: SyntaxKind): boolean {
    return kind === SyntaxKind.CodeBlock || kind === SyntaxKind.ContentBlock;
  }

  export function isStmt(kind: SyntaxKind): boolean {
    switch (kind) {
      case SyntaxKind.LetBinding:
      case SyntaxKind.SetRule:
      case SyntaxKind.ShowRule:
      case SyntaxKind.ModuleImport:
      case SyntaxKind.ModuleInclude:
        return true;
      default:
        return false;
    }
  }

  export function isKeyword(kind: SyntaxKind): boolean {
    switch (kind) {
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
      default:
        return false;
    }
  }

  export function isTrivia(kind: SyntaxKind): boolean {
    switch (kind) {
      case SyntaxKind.Shebang:
      case SyntaxKind.LineComment:
      case SyntaxKind.BlockComment:
      case SyntaxKind.Space:
      case SyntaxKind.Parbreak:
        return true;
      default:
        return false;
    }
  }

  export function isError(kind: SyntaxKind): boolean {
    return kind === SyntaxKind.Error;
  }

  export function name(kind: SyntaxKind): string {
    switch (kind) {
      case SyntaxKind.End:
        return 'end of tokens';
      case SyntaxKind.Error:
        return 'syntax error';
      case SyntaxKind.Shebang:
        return 'shebang';
      case SyntaxKind.LineComment:
        return 'line comment';
      case SyntaxKind.BlockComment:
        return 'block comment';
      case SyntaxKind.Markup:
        return 'markup';
      case SyntaxKind.Text:
        return 'text';
      case SyntaxKind.Space:
        return 'space';
      case SyntaxKind.Linebreak:
        return 'line break';
      case SyntaxKind.Parbreak:
        return 'paragraph break';
      case SyntaxKind.Escape:
        return 'escape sequence';
      case SyntaxKind.Shorthand:
        return 'shorthand';
      case SyntaxKind.SmartQuote:
        return 'smart quote';
      case SyntaxKind.Strong:
        return 'strong content';
      case SyntaxKind.Emph:
        return 'emphasized content';
      case SyntaxKind.Raw:
        return 'raw block';
      case SyntaxKind.RawLang:
        return 'raw language tag';
      case SyntaxKind.RawTrimmed:
        return 'raw trimmed';
      case SyntaxKind.RawDelim:
        return 'raw delimiter';
      case SyntaxKind.Link:
        return 'link';
      case SyntaxKind.Label:
        return 'label';
      case SyntaxKind.Ref:
        return 'reference';
      case SyntaxKind.RefMarker:
        return 'reference marker';
      case SyntaxKind.Heading:
        return 'heading';
      case SyntaxKind.HeadingMarker:
        return 'heading marker';
      case SyntaxKind.ListItem:
        return 'list item';
      case SyntaxKind.ListMarker:
        return 'list marker';
      case SyntaxKind.EnumItem:
        return 'enum item';
      case SyntaxKind.EnumMarker:
        return 'enum marker';
      case SyntaxKind.TermItem:
        return 'term list item';
      case SyntaxKind.TermMarker:
        return 'term marker';
      case SyntaxKind.Equation:
        return 'equation';
      case SyntaxKind.Math:
        return 'math';
      case SyntaxKind.MathText:
        return 'math text';
      case SyntaxKind.MathIdent:
        return 'math identifier';
      case SyntaxKind.MathShorthand:
        return 'math shorthand';
      case SyntaxKind.MathAlignPoint:
        return 'math alignment point';
      case SyntaxKind.MathDelimited:
        return 'delimited math';
      case SyntaxKind.MathAttach:
        return 'math attachments';
      case SyntaxKind.MathFrac:
        return 'math fraction';
      case SyntaxKind.MathRoot:
        return 'math root';
      case SyntaxKind.MathPrimes:
        return 'math primes';
      case SyntaxKind.Hash:
        return 'hash';
      case SyntaxKind.LeftBrace:
        return 'opening brace';
      case SyntaxKind.RightBrace:
        return 'closing brace';
      case SyntaxKind.LeftBracket:
        return 'opening bracket';
      case SyntaxKind.RightBracket:
        return 'closing bracket';
      case SyntaxKind.LeftParen:
        return 'opening paren';
      case SyntaxKind.RightParen:
        return 'closing paren';
      case SyntaxKind.Comma:
        return 'comma';
      case SyntaxKind.Semicolon:
        return 'semicolon';
      case SyntaxKind.Colon:
        return 'colon';
      case SyntaxKind.Star:
        return 'star';
      case SyntaxKind.Underscore:
        return 'underscore';
      case SyntaxKind.Dollar:
        return 'dollar sign';
      case SyntaxKind.Plus:
        return 'plus';
      case SyntaxKind.Minus:
        return 'minus';
      case SyntaxKind.Slash:
        return 'slash';
      case SyntaxKind.Hat:
        return 'hat';
      case SyntaxKind.Prime:
        return 'prime';
      case SyntaxKind.Dot:
        return 'dot';
      case SyntaxKind.Eq:
        return 'equals sign';
      case SyntaxKind.EqEq:
        return 'equality operator';
      case SyntaxKind.ExclEq:
        return 'inequality operator';
      case SyntaxKind.Lt:
        return 'less-than operator';
      case SyntaxKind.LtEq:
        return 'less-than or equal operator';
      case SyntaxKind.Gt:
        return 'greater-than operator';
      case SyntaxKind.GtEq:
        return 'greater-than or equal operator';
      case SyntaxKind.PlusEq:
        return 'add-assign operator';
      case SyntaxKind.HyphEq:
        return 'subtract-assign operator';
      case SyntaxKind.StarEq:
        return 'multiply-assign operator';
      case SyntaxKind.SlashEq:
        return 'divide-assign operator';
      case SyntaxKind.Dots:
        return 'dots';
      case SyntaxKind.Arrow:
        return 'arrow';
      case SyntaxKind.Root:
        return 'root';
      case SyntaxKind.Not:
        return 'operator `not`';
      case SyntaxKind.And:
        return 'operator `and`';
      case SyntaxKind.Or:
        return 'operator `or`';
      case SyntaxKind.None:
        return '`none`';
      case SyntaxKind.Auto:
        return '`auto`';
      case SyntaxKind.Let:
        return 'keyword `let`';
      case SyntaxKind.Set:
        return 'keyword `set`';
      case SyntaxKind.Show:
        return 'keyword `show`';
      case SyntaxKind.Context:
        return 'keyword `context`';
      case SyntaxKind.If:
        return 'keyword `if`';
      case SyntaxKind.Else:
        return 'keyword `else`';
      case SyntaxKind.For:
        return 'keyword `for`';
      case SyntaxKind.In:
        return 'keyword `in`';
      case SyntaxKind.While:
        return 'keyword `while`';
      case SyntaxKind.Break:
        return 'keyword `break`';
      case SyntaxKind.Continue:
        return 'keyword `continue`';
      case SyntaxKind.Return:
        return 'keyword `return`';
      case SyntaxKind.Import:
        return 'keyword `import`';
      case SyntaxKind.Include:
        return 'keyword `include`';
      case SyntaxKind.As:
        return 'keyword `as`';
      case SyntaxKind.Code:
        return 'code';
      case SyntaxKind.Ident:
        return 'identifier';
      case SyntaxKind.Bool:
        return 'boolean';
      case SyntaxKind.Int:
        return 'integer';
      case SyntaxKind.Float:
        return 'float';
      case SyntaxKind.Numeric:
        return 'numeric value';
      case SyntaxKind.Str:
        return 'string';
      case SyntaxKind.CodeBlock:
        return 'code block';
      case SyntaxKind.ContentBlock:
        return 'content block';
      case SyntaxKind.Parenthesized:
        return 'group';
      case SyntaxKind.Array:
        return 'array';
      case SyntaxKind.Dict:
        return 'dictionary';
      case SyntaxKind.Named:
        return 'named pair';
      case SyntaxKind.Keyed:
        return 'keyed pair';
      case SyntaxKind.Unary:
        return 'unary expression';
      case SyntaxKind.Binary:
        return 'binary expression';
      case SyntaxKind.FieldAccess:
        return 'field access';
      case SyntaxKind.FuncCall:
        return 'function call';
      case SyntaxKind.Args:
        return 'call arguments';
      case SyntaxKind.Spread:
        return 'spread';
      case SyntaxKind.Closure:
        return 'closure';
      case SyntaxKind.Params:
        return 'closure parameters';
      case SyntaxKind.LetBinding:
        return '`let` expression';
      case SyntaxKind.SetRule:
        return '`set` expression';
      case SyntaxKind.ShowRule:
        return '`show` expression';
      case SyntaxKind.Contextual:
        return '`context` expression';
      case SyntaxKind.Conditional:
        return '`if` expression';
      case SyntaxKind.WhileLoop:
        return 'while-loop expression';
      case SyntaxKind.ForLoop:
        return 'for-loop expression';
      case SyntaxKind.ModuleImport:
        return '`import` expression';
      case SyntaxKind.ImportItems:
        return 'import items';
      case SyntaxKind.ImportItemPath:
        return 'imported item path';
      case SyntaxKind.RenamedImportItem:
        return 'renamed import item';
      case SyntaxKind.ModuleInclude:
        return '`include` expression';
      case SyntaxKind.LoopBreak:
        return '`break` expression';
      case SyntaxKind.LoopContinue:
        return '`continue` expression';
      case SyntaxKind.FuncReturn:
        return '`return` expression';
      case SyntaxKind.Destructuring:
        return 'destructuring pattern';
      case SyntaxKind.DestructAssignment:
        return 'destructuring assignment expression';
      default:
        return '';
    }
  }
}
