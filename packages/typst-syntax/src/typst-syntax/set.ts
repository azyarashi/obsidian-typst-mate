import { SyntaxKind } from './kind';

export type SyntaxSet = bigint;

export namespace SyntaxSet {
  export function empty(): SyntaxSet {
    return 0n;
  }

  export function add(set: SyntaxSet, kind: SyntaxKind): SyntaxSet {
    if (kind >= 128) {
      throw new Error(`SyntaxKind ${kind} is out of bounds for SyntaxSet (max 127)`);
    }
    return set | (1n << BigInt(kind as number));
  }

  export function union(set: SyntaxSet, other: SyntaxSet): SyntaxSet {
    return set | other;
  }

  export function contains(set: SyntaxSet, kind: SyntaxKind): boolean {
    if (kind >= 128) return false;
    return (set & (1n << BigInt(kind as number))) !== 0n;
  }

  export function create(...kinds: SyntaxKind[]): SyntaxSet {
    let set = 0n;
    for (const kind of kinds) {
      if (kind >= 128) {
        throw new Error(`SyntaxKind ${kind} is out of bounds for SyntaxSet (max 127)`);
      }
      set |= 1n << BigInt(kind as number);
    }
    return set;
  }
}

export const STMT = SyntaxSet.create(
  SyntaxKind.Let,
  SyntaxKind.Set,
  SyntaxKind.Show,
  SyntaxKind.Import,
  SyntaxKind.Include,
  SyntaxKind.Return,
);

export const MATH_EXPR = SyntaxSet.create(
  SyntaxKind.Hash,
  SyntaxKind.MathIdent,
  SyntaxKind.FieldAccess,
  SyntaxKind.Dot,
  SyntaxKind.Comma,
  SyntaxKind.Semicolon,
  SyntaxKind.RightParen,
  SyntaxKind.Text,
  SyntaxKind.MathText,
  SyntaxKind.MathShorthand,
  SyntaxKind.Linebreak,
  SyntaxKind.MathAlignPoint,
  SyntaxKind.Escape,
  SyntaxKind.Str,
  SyntaxKind.Root,
  SyntaxKind.Prime,
);

export const UNARY_OP = SyntaxSet.create(SyntaxKind.Plus, SyntaxKind.Minus, SyntaxKind.Not);

export const BINARY_OP = SyntaxSet.create(
  SyntaxKind.Plus,
  SyntaxKind.Minus,
  SyntaxKind.Star,
  SyntaxKind.Slash,
  SyntaxKind.And,
  SyntaxKind.Or,
  SyntaxKind.EqEq,
  SyntaxKind.ExclEq,
  SyntaxKind.Lt,
  SyntaxKind.LtEq,
  SyntaxKind.Gt,
  SyntaxKind.GtEq,
  SyntaxKind.Eq,
  SyntaxKind.In,
  SyntaxKind.PlusEq,
  SyntaxKind.HyphEq,
  SyntaxKind.StarEq,
  SyntaxKind.SlashEq,
);

export const ATOMIC_CODE_PRIMARY = SyntaxSet.create(
  SyntaxKind.Ident,
  SyntaxKind.LeftBrace,
  SyntaxKind.LeftBracket,
  SyntaxKind.LeftParen,
  SyntaxKind.Dollar,
  SyntaxKind.Let,
  SyntaxKind.Set,
  SyntaxKind.Show,
  SyntaxKind.Context,
  SyntaxKind.If,
  SyntaxKind.While,
  SyntaxKind.For,
  SyntaxKind.Import,
  SyntaxKind.Include,
  SyntaxKind.Break,
  SyntaxKind.Continue,
  SyntaxKind.Return,
  SyntaxKind.None,
  SyntaxKind.Auto,
  SyntaxKind.Int,
  SyntaxKind.Float,
  SyntaxKind.Bool,
  SyntaxKind.Numeric,
  SyntaxKind.Str,
  SyntaxKind.Label,
  SyntaxKind.Raw,
);

export const CODE_PRIMARY = SyntaxSet.add(ATOMIC_CODE_PRIMARY, SyntaxKind.Underscore);

export const ATOMIC_CODE_EXPR = ATOMIC_CODE_PRIMARY;

export const CODE_EXPR = SyntaxSet.union(CODE_PRIMARY, UNARY_OP);

export const ARRAY_OR_DICT_ITEM = SyntaxSet.add(CODE_EXPR, SyntaxKind.Dots);

export const ARG = SyntaxSet.add(CODE_EXPR, SyntaxKind.Dots);

export const PATTERN_LEAF = ATOMIC_CODE_EXPR;

export const PATTERN = SyntaxSet.add(SyntaxSet.add(PATTERN_LEAF, SyntaxKind.LeftParen), SyntaxKind.Underscore);

export const PARAM = SyntaxSet.add(PATTERN, SyntaxKind.Dots);

export const DESTRUCTURING_ITEM = SyntaxSet.add(PATTERN, SyntaxKind.Dots);
