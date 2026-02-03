/** biome-ignore-all lint/suspicious/noShadowRestrictedNames: TODO */
import type { SyntaxError, SyntaxKind, SyntaxMode } from '.';

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
  errors?: SyntaxError[];
  mode?: SyntaxMode;
}
