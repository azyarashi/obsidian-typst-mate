import { LinkedNode, SyntaxKind, type SyntaxNode } from '@typstmate/typst-syntax';
import { codeFolding, foldGutter, foldService } from '@codemirror/language';
import { type EditorState, StateEffect, StateField } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { getActiveRegion } from '../../../shared/utils/core';

interface FoldingState {
  tree: SyntaxNode;
  baseOffset: number;
}

const foldingTreeEffect = StateEffect.define<FoldingState | undefined>();
const foldingTreeState = StateField.define<FoldingState | undefined>({
  create() {
    return undefined;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(foldingTreeEffect)) return effect.value;
    }
    return value;
  },
});

function findFoldRange(state: EditorState, lineStart: number, lineEnd: number): { from: number; to: number } | null {
  const foldingState = state.field(foldingTreeState, false);
  if (!foldingState?.tree) return null;

  const root = LinkedNode.new(foldingState.tree);
  return findFoldRangeInNode(root, lineStart, lineEnd, state, foldingState.baseOffset);
}

function findFoldRangeInNode(
  node: LinkedNode,
  lineStart: number,
  lineEnd: number,
  state: EditorState,
  baseOffset: number,
): { from: number; to: number } | null {
  const kind = node.kind();
  const nodeStart = baseOffset + node.offset;
  const nodeEnd = nodeStart + node.len();

  if (nodeStart >= lineStart && nodeStart <= lineEnd && nodeEnd > lineEnd) {
    const range = getFoldRangeForKind(node, kind, state, baseOffset);
    if (range) return range;
  }

  if (nodeEnd < lineStart || nodeStart > lineEnd + 1) return null;

  for (const child of node.children()) {
    const result = findFoldRangeInNode(child, lineStart, lineEnd, state, baseOffset);
    if (result) return result;
  }

  return null;
}

function getFoldRangeForKind(
  node: LinkedNode,
  kind: SyntaxKind,
  state: EditorState,
  baseOffset: number,
): { from: number; to: number } | null {
  const nodeStart = baseOffset + node.offset;
  const nodeEnd = nodeStart + node.len();

  switch (kind) {
    case SyntaxKind.CodeBlock:
    case SyntaxKind.ContentBlock:
    case SyntaxKind.Args:
    case SyntaxKind.Array:
    case SyntaxKind.Dict:
    case SyntaxKind.Params:
    case SyntaxKind.Parenthesized:
      return foldBracketed(node, baseOffset);

    case SyntaxKind.Equation: {
      const startLine = state.doc.lineAt(nodeStart);
      const endLine = state.doc.lineAt(nodeEnd - 1);
      if (startLine.number === endLine.number) return null;
      return { from: startLine.to, to: endLine.from - 1 };
    }

    case SyntaxKind.Heading: {
      return foldHeading(node, state, baseOffset);
    }

    default:
      return null;
  }
}

function foldBracketed(node: LinkedNode, baseOffset: number): { from: number; to: number } | null {
  const children = node.children();
  if (children.length < 2) return null;

  const first = children[0];
  const last = children[children.length - 1];
  if (!first || !last) return null;

  const from = baseOffset + first.offset + first.len();
  const to = baseOffset + last.offset;

  if (from >= to) return null;
  return { from, to };
}

function foldHeading(
  headingNode: LinkedNode,
  state: EditorState,
  baseOffset: number,
): { from: number; to: number } | null {
  const depth = getHeadingDepth(headingNode);
  if (depth === 0) return null;

  const nodeStart = baseOffset + headingNode.offset;
  const nodeEnd = nodeStart + headingNode.len();
  const headingLine = state.doc.lineAt(nodeEnd - 1);

  const root = getRoot(headingNode);
  if (!root) return null;

  let foldTo = state.doc.length;

  for (const sibling of root.children()) {
    if (sibling.kind() !== SyntaxKind.Heading) continue;
    const sibStart = baseOffset + sibling.offset;
    if (sibStart <= nodeStart) continue;

    const sibDepth = getHeadingDepth(sibling);
    if (sibDepth <= depth) {
      const sibLine = state.doc.lineAt(sibStart);
      const prevLine = sibLine.number > 1 ? state.doc.line(sibLine.number - 1) : sibLine;
      foldTo = prevLine.to;
      break;
    }
  }

  if (foldTo <= headingLine.to) return null;
  return { from: headingLine.to, to: foldTo };
}

function getHeadingDepth(headingNode: LinkedNode): number {
  for (const child of headingNode.children()) {
    if (child.kind() === SyntaxKind.HeadingMarker) {
      return child.node.text().length;
    }
  }
  return 0;
}

function getRoot(node: LinkedNode): LinkedNode {
  let curr: LinkedNode = node;
  while (curr.parent) curr = curr.parent;
  return curr;
}

const foldingTreeSyncPlugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.syncTree(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.syncTree(update.view);
      }
    }

    syncTree(view: EditorView) {
      const region = getActiveRegion(view);
      if (region?.tree) {
        requestAnimationFrame(() => {
          view.dispatch({
            effects: foldingTreeEffect.of({
              tree: region.tree!,
              baseOffset: region.from + region.skip,
            }),
          });
        });
      }
    }
  },
);

export const typstFoldingExtension = [
  foldingTreeState,
  foldingTreeSyncPlugin,
  foldService.of(findFoldRange),
  codeFolding(),
  foldGutter(),
];
