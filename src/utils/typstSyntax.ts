import { LinkedNode, Side, SyntaxKind, SyntaxMode, type SyntaxNode } from '@typstmate/typst-syntax';
import type { ParsedRegion } from '@/editor/shared/utils/core';

export function getModeAndKind(
  node: SyntaxNode,
  cursor: number,
  mode: SyntaxMode,
): { kindLeft: SyntaxKind | null; kindRight: SyntaxKind | null; mode: SyntaxMode | null } {
  const linkedNode = LinkedNode.new(node);
  const leftNode = linkedNode.leafAt(cursor, Side.Before);
  const rightNode = linkedNode.leafAt(cursor, Side.After);
  const syntaxKindLeft = leftNode?.kind() ?? SyntaxKind.None;
  const syntaxKindRight = rightNode?.kind() ?? SyntaxKind.End;

  const leftMode = getMode(leftNode) ?? mode;
  const rightMode = getMode(rightNode) ?? mode;

  // 両側が同じ
  if (leftMode === rightMode) mode = leftMode;
  // 左側が 行コメント または エスケープ
  else if (syntaxKindLeft === SyntaxKind.LineComment || syntaxKindLeft === SyntaxKind.Escape) mode = SyntaxMode.Opaque;
  // 右側が コードモード
  else if (rightMode === SyntaxMode.Code) mode = SyntaxMode.Code;
  // Code の後
  else if (SyntaxKind.isTerminator(syntaxKindLeft) || syntaxKindLeft === SyntaxKind.Dollar) mode = rightMode;
  else mode = leftMode;

  return { kindLeft: syntaxKindLeft, kindRight: syntaxKindRight, mode };
}

export function getModeAndKindFromRegion(
  region: ParsedRegion | null,
  pos: number,
): { kindLeft: SyntaxKind | null; kindRight: SyntaxKind | null; mode: SyntaxMode | null } {
  if (!region?.tree) return { kindLeft: null, kindRight: null, mode: null };

  const offset = region.from + region.skip;
  const relativePos = pos - offset;

  return getModeAndKind(region.tree, relativePos, region.mode);
}

function getMode(node?: LinkedNode): SyntaxMode | null {
  while (node) {
    const k = node.kind();

    if (isOpaqueKind(k)) return SyntaxMode.Opaque;
    if (k === SyntaxKind.Equation || k === SyntaxKind.Math) return SyntaxMode.Math;
    if (k === SyntaxKind.ContentBlock || k === SyntaxKind.Markup) return SyntaxMode.Markup;
    if (
      (SyntaxKind.Code <= k && k <= SyntaxKind.Numeric) ||
      (SyntaxKind.Parenthesized <= k && k <= SyntaxKind.Binary) ||
      SyntaxKind.LetBinding <= k
    )
      return SyntaxMode.Code;

    node = node.parent;
  }

  return null; // デフォルト
}

function isOpaqueKind(k: SyntaxKind) {
  return (
    k === SyntaxKind.Shebang || // #! ...
    k === SyntaxKind.LineComment || // // ...
    k === SyntaxKind.BlockComment || // /* ... */
    k === SyntaxKind.Raw || // raw
    k === SyntaxKind.Link || // [url](url)
    k === SyntaxKind.Ref || // @target
    k === SyntaxKind.Label || // <label></label>
    k === SyntaxKind.Str // "..."
  );
}
