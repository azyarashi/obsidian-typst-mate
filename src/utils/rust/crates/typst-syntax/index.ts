// https://github.com/typst/typst/blob/v0.14.2/crates/typst-syntax/src/lib.rs

import { CSSClass, highlight, isToken } from './highlight';
import {
  getCloseKind,
  isBracket,
  isKeyword,
  isOpenBracket,
  // biome-ignore lint/suspicious/noShadowRestrictedNames: 他との名前を揃えるため
  type SyntaxError,
  SyntaxKind,
  type SyntaxNode,
  type SyntaxToken,
} from './kind';
import type { Lexer } from './lexer';
import type { Parser } from './parser';

export {
  SyntaxKind,
  getCloseKind,
  isOpenBracket,
  highlight,
  isToken,
  isBracket,
  isKeyword,
  CSSClass,
  type SyntaxNode,
  type SyntaxToken,
  type SyntaxError,
};

export type { Lexer };
export type { Parser };

export enum SyntaxMode {
  Markup = 'Markup',
  Code = 'Code',
  Math = 'Math',
  Opaque = 'Opaque', // Shebang, LineComment, BlockComment, Str, Raw, Link, Label
}
