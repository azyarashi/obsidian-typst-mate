/** biome-ignore-all assist/source/organizeImports: match original */

export { FileId } from './file';
export { CSSClass, highlight } from './highlight';
export { SyntaxKind } from './kind';
export {
  isIdContinue,
  isIdStart,
  isIdent,
  isNewline,
  linkPrefix,
  splitNewlines,
} from './lexer';
export { Lines } from './lines';
export { LinkedNode, Side, SyntaxErrorNode as SyntaxError, SyntaxNode } from './node';
export { parse, parseCode, parseMath } from './parser';
export { VirtualPath } from './path';
export { Span, Spanned } from './span';

export * as Lexer from './lexer';
export { reparse } from './reparser';

export enum SyntaxMode {
  Markup,
  Math,
  Code,
  Opaque,
}
