// https://github.com/typst/typst/blob/v0.14.2/crates/typst-syntax/src/lib.rs

import { CSSClass, highlight, isToken } from './highlight';
import {
  getCloseKind,
  isBracket,
  isKeyword,
  isOpenBracket,
  SyntaxKind,
  type SyntaxNode,
  type SyntaxToken,
  type TypstSyntaxError,
} from './kind';
import { TypstLexer } from './lexer';
import { TypstParser } from './parser';

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
  type TypstSyntaxError,
};

export { TypstLexer };
export { TypstParser };

export enum SyntaxMode {
  Markup = 'Markup',
  Code = 'Code',
  Math = 'Math',
}
