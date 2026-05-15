import { LinkedNode, Side, SyntaxKind, SyntaxMode, type SyntaxNode } from '@/typst-syntax';

export interface SyntaxContext {
  mode: SyntaxMode | null;
  /**
   * Whether the position is currently within a node that is treated as a block-level element.
   *
   * Note:
   * - This property reflects the underlying syntax, **so it remains consistent regardless of how *set* and *show* rules customize the element**.
   * - If `undefined`, the state is inferred from the parent node.
   *
   * Logic details per mode:
   * - **{@link SyntaxMode.Markup}**: Inside a {@link SyntaxKind.ContentBlock}.
   * - **{@link SyntaxMode.Math}**: Inside a {@link SyntaxKind.Equation} whose leading and trailing children are {@link SyntaxKind.Space}.
   * - **{@link SyntaxMode.Code}**: Inside a {@link SyntaxKind.CodeBlock}.
   * - **{@link SyntaxMode.Plain}**: Inside a {@link SyntaxKind.BlockComment} or a multi-line {@link SyntaxKind.Raw}.
   */
  isBlock?: boolean;

  kindLeft: SyntaxKind | null;
  kindRight: SyntaxKind | null;
}

export function getSyntaxContextAt(
  node: SyntaxNode,
  pos: number,
  topMode: SyntaxMode = SyntaxMode.Markup,
): SyntaxContext {
  const linkedNode = LinkedNode.new(node);

  const nodeLeft = linkedNode.leafAt(pos, Side.Before);
  const nodeRight = linkedNode.leafAt(pos, Side.After);
  const kindLeft = nodeLeft?.kind() ?? mapModeToKind(topMode);
  const kindRight = nodeRight?.kind() ?? SyntaxKind.End;
  // ? The start of document
  if (nodeLeft === undefined) {
    return {
      mode: topMode,
      isBlock:
        (topMode === SyntaxMode.Math &&
          kindRight === SyntaxKind.Space &&
          linkedNode.leafAt(linkedNode.len(), Side.Before)?.kind() === SyntaxKind.Space) ??
        undefined,
      kindLeft,
      kindRight,
    };
  }

  // ? Previous sibling is a Hash
  if (kindLeft === SyntaxKind.Hash) return { mode: SyntaxMode.Code, isBlock: false, kindLeft, kindRight };

  // ? Plain mode detection for cases other than Raw
  if (isNonRawPlain(pos, kindLeft, kindRight, nodeLeft.offset))
    return { mode: SyntaxMode.Plain, isBlock: kindLeft === SyntaxKind.BlockComment, kindLeft, kindRight };

  const { mode: detectedMode, isBlock } = getSyntaxContextAtInternal(
    getTargetNode(nodeLeft, kindLeft, pos) ?? nodeLeft,
    pos,
  );
  const mode = detectedMode ?? topMode;

  if (mode === SyntaxMode.Math && isBlock === undefined) {
    const kindStart = linkedNode.leafAt(0, Side.After)?.kind();
    const kindEnd = linkedNode.leafAt(linkedNode.len(), Side.Before)?.kind();
    const isBlock = kindStart === SyntaxKind.Space && kindEnd === SyntaxKind.Space;
    return { mode, isBlock, kindLeft, kindRight };
  }

  return { mode, isBlock, kindLeft, kindRight };
}

export function isNonRawPlain(
  pos: number,
  leftKind: SyntaxKind | null,
  rightKind: SyntaxKind | null,
  offset: number,
): boolean {
  // ! Sorted by frequency.
  // ! The basic criterion is whether entering characters keeps the current mode unchanged.

  // ? Only inside string quotes
  if (leftKind === SyntaxKind.Str && rightKind === SyntaxKind.Str) return true;
  if (pos <= offset + 1) return false;
  // ? Only after `//` because typing inside the slashes would break the comment
  else if (leftKind === SyntaxKind.LineComment) return true;
  // ? Right-side range check is omitted because typing after the comment start opens a block comment anyway
  else if (leftKind === SyntaxKind.BlockComment && rightKind === SyntaxKind.BlockComment) return true;
  // ? Only after `#!`
  else if (leftKind === SyntaxKind.Shebang) return true;

  return false;
}

function getTargetNode(node: LinkedNode, kind: SyntaxKind | null, pos: number): LinkedNode | undefined {
  if (kind !== SyntaxKind.Space && kind !== SyntaxKind.Parbreak) return node;

  const textBefore = node.text().slice(0, pos - node.offset);
  if (textBefore.includes('\n')) return node.parent;

  let prevNode = node.prevSibling();
  if (!prevNode) return node.parent;

  let prevKind = prevNode.kind();
  while (prevKind === SyntaxKind.Math) {
    prevNode = prevNode.children().at(-1);
    if (!prevNode) return node.parent;
    prevKind = prevNode.kind();
  }

  if (SyntaxKind.isStmt(prevKind) || isControl(prevKind)) return prevNode;

  return node.parent;
}

function getSyntaxContextAtInternal(leftNode: LinkedNode, pos: number): Partial<SyntaxContext> {
  let k: SyntaxKind;
  let node: LinkedNode | undefined = leftNode;
  const isDelim = leftNode?.kind() === SyntaxKind.RawDelim;

  while (node) {
    k = node.kind();

    // * Math
    if (k === SyntaxKind.Math) {
      do {
        node = node.parent;
      } while (node?.kind() === SyntaxKind.Math);
      if (!node) return {}; // Fallback to top-level context

      k = node.kind();
    }
    if (k === SyntaxKind.Equation) {
      const { start, end } = node.range();
      if (pos < end) {
        const kindLeft = node.leafAt(start + 1, Side.After)?.kind();
        const kindRight = node.leafAt(end - 1, Side.Before)?.kind();
        const isBlock = kindLeft === SyntaxKind.Space && kindRight === SyntaxKind.Space;

        return { mode: SyntaxMode.Math, isBlock };
      }

      node = node.parent;
      continue;
    }

    // * Markup
    if (k === SyntaxKind.Markup) {
      node = node.parent;
      if (!node) return {}; // Fallback to top-level context
      k = node.kind();
    }
    if (k === SyntaxKind.ContentBlock) {
      const end = node.offset + node.len();
      if (pos < end) return { mode: SyntaxMode.Markup, isBlock: true };

      node = node.parent;
      continue;
    }

    // * Plain
    if (k === SyntaxKind.Raw && !isDelim) {
      const { start, end } = node.range();
      const delimLength = leftNode.text().length - 1;
      if (start + delimLength <= pos && pos <= end - delimLength)
        return { mode: SyntaxMode.Plain, isBlock: node.text().includes('\n') };
    }

    // * Code
    if (k === SyntaxKind.Code) {
      node = node.parent;
      if (!node) return {}; // Fallback to top-level context
      return { mode: SyntaxMode.Code, isBlock: node.kind() === SyntaxKind.CodeBlock };
    }
    if (k === SyntaxKind.CodeBlock) {
      const end = node.offset + node.len();
      if (pos <= end) return { mode: SyntaxMode.Code, isBlock: true };

      node = node.parent;
      continue;
    }
    if (node.prevSiblingKind() === SyntaxKind.Hash) return { mode: SyntaxMode.Code, isBlock: false };

    node = node.parent;
  }

  return {};
}

// * utils

export function mapModeToKind(mode: SyntaxMode): SyntaxKind {
  switch (mode) {
    case SyntaxMode.Markup:
      return SyntaxKind.Markup;
    case SyntaxMode.Code:
      return SyntaxKind.Code;
    case SyntaxMode.Math:
      return SyntaxKind.Math;
    case SyntaxMode.Plain:
      return SyntaxKind.End;
  }
}

function isControl(k: SyntaxKind): boolean {
  return (
    k === SyntaxKind.Contextual ||
    k === SyntaxKind.Conditional ||
    k === SyntaxKind.ForLoop ||
    k === SyntaxKind.WhileLoop
  );
}
