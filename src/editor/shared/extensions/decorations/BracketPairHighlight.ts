import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import {
  getCloseKind,
  isBracket,
  isOpenBracket,
  SyntaxKind,
  type SyntaxNode,
  type SyntaxToken,
} from '@/utils/rust/crates/typst-synatx';

import { getActiveRegion, typstMateCore } from '../core/TypstMate';

// --- Helpers ---

const getBracketType = (kind: SyntaxKind): string | null => {
  switch (kind) {
    case SyntaxKind.LeftParen:
    case SyntaxKind.RightParen:
      return 'paren';
    case SyntaxKind.LeftBracket:
    case SyntaxKind.RightBracket:
      return 'bracket';
    case SyntaxKind.LeftBrace:
    case SyntaxKind.RightBrace:
      return 'brace';
    default:
      return null;
  }
};

const findInnermostPair = (
  node: SyntaxNode | SyntaxToken,
  cursor: number,
): { open: SyntaxNode | SyntaxToken; close: SyntaxNode | SyntaxToken } | null => {
  if (node.from > cursor || node.to < cursor) return null;

  // 1. Try recurse into specific child
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      if (child.from <= cursor && child.to >= cursor) {
        const deep = findInnermostPair(child, cursor);
        if (deep) return deep;
        break;
      }
    }
  }

  // 2. Sibling Scan (at this level)
  // Only if 'node' has children
  if (!('children' in node) || !node.children) return null;
  const children = node.children;
  if (children.length === 0) return null;

  const stack: (SyntaxNode | SyntaxToken)[] = [];
  let bestPair: { open: SyntaxNode | SyntaxToken; close: SyntaxNode | SyntaxToken } | null = null;

  for (const child of children) {
    // If child is brackets
    if (isBracket(child.kind)) {
      if (isOpenBracket(child.kind)) {
        stack.push(child);
      } else {
        // Close bracket
        if (stack.length > 0) {
          const open = stack[stack.length - 1]!;
          const closeKind = getCloseKind(open.kind);
          if (closeKind === child.kind) {
            stack.pop();
            // Check overlap
            if (open.from <= cursor && child.to >= cursor) {
              if (!bestPair || open.from > bestPair.open.from) {
                bestPair = { open, close: child };
              }
            }
          }
        }
      }
    }
  }
  return bestPair;
};

// --- Main Extension ---

import { editorHelperFacet } from '../core/Helper';

export const bracketHighlightExtension: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const helper = view.state.facet(editorHelperFacet);
      if (!helper || helper.plugin.settings.disableBracketHighlight) return Decoration.none;

      const parserData = view.plugin(typstMateCore);
      if (!parserData) return Decoration.none;

      const builder = new RangeSetBuilder<Decoration>();
      const cursor = view.state.selection.main.head;

      const region = getActiveRegion(view);
      if (!region) return Decoration.none;

      const pair = findInnermostPair(region.root, cursor);
      if (pair) {
        const type = getBracketType(pair.open.kind);
        if (type) {
          const cls = `typstmate-bracket-${type} typstmate-bracket-enclosing`;
          builder.add(pair.open.from, pair.open.to, Decoration.mark({ class: cls }));
          builder.add(pair.close.from, pair.close.to, Decoration.mark({ class: cls }));
        }
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations },
);
