import { LinkedNode, Side, SyntaxKind, SyntaxMode } from '@typstmate/typst-syntax';

import type { ParsedRegion } from '@/editor/shared/utils/core';

export function getModeAndKind(
  region: ParsedRegion | null,
  pos: number,
): { kind: SyntaxKind | null; mode: SyntaxMode | null } {
  if (!region || !region.tree) return { kind: null, mode: null };

  let mode: SyntaxMode | null = region.mode;

  const offset = region.from + region.skip;
  const relativePos = pos - offset;

  const linkedNode = LinkedNode.new(region.tree);
  const leftNode = linkedNode.leafAt(relativePos, Side.Before);
  const rightNode = linkedNode.leafAt(relativePos, Side.After);
  const syntaxKindLeft = leftNode?.kind() ?? SyntaxKind.None;
  const syntaxKindRight = rightNode?.kind() ?? SyntaxKind.End;

  const leftMode = getMode(leftNode) ?? region.mode;
  const rightMode = getMode(rightNode) ?? region.mode;

  // 両側が同じ
  if (leftMode === rightMode) mode = leftMode;
  // 左側が 行コメント または エスケープ
  else if (syntaxKindLeft === SyntaxKind.LineComment || syntaxKindLeft === SyntaxKind.Escape) mode = SyntaxMode.Opaque;
  // 右側が コードモード
  else if (rightMode === SyntaxMode.Code) mode = SyntaxMode.Code;
  // Code の後
  else if (SyntaxKind.isTerminator(syntaxKindLeft) || syntaxKindLeft === SyntaxKind.Dollar) mode = rightMode;
  else mode = leftMode;

  return { kind: syntaxKindRight, mode };
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
