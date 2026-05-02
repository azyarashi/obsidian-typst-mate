// biome-ignore-all assist/source/organizeImports: match original

// TODO ast
export * as package_ from './package';

export { FileId } from './file';
export { CSSClass, highlight } from './highlight';  // TODO Tag
export { SyntaxKind } from './kind';
export {
  isIdContinue, isIdStart, isIdent, isNewline, isValidLabelLiteralId,
  linkPrefix, splitNewlines,
} from './lexer';
export { Lines } from './lines';
export { LinkedNode, Side, SyntaxErrorNode as SyntaxError, SyntaxNode } from './node';  // TODO LinkedChildren
export { parse, parseCode, parseMath } from './parser';
export { VirtualPath } from './path';
// TODO Source
export { Span, Spanned } from './span';

export * as Lexer from './lexer';
export { reparse } from './reparser';  // TODO reparseBlock, reparseMarkup

/** The syntax mode of a portion of Typst code. */
export enum SyntaxMode {
  /** Text and markup, as in the top level. */
  Markup,
  /** Math atoms, operators, etc., as in equations. */
  Math,
  /** Keywords, literals and operators, as after hashes. */
  Code,
  /** An additional mode for plain text, as in comments, strings, raw blocks, and shebangs. */
  Plain,
}

// extras
export * from '../extras';
