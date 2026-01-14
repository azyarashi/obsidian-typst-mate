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

import { type TypstParserPluginValue, typstMatePlugin } from '../core/TypstMate';

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
        // If child matches cursor but yields no pair (e.g. it's a leaf block),
        // we still might find a pair at THIS level (siblings) that encloses the child?
        // Actually no, if we are INSIDE a child block, the sibling brackets of that child
        // would NOT enclose the cursor in the "token stream" sense unless the child is PART of the bracket content.
        // But if `child` is `CodeBlock`, the brackets are INSIDE `CodeBlock` siblings scan.
        // If `child` is `Expr` inside `( Expr )`.
        // The `findInnermostPair(child)` returns null.
        // We fall through to Sibling Scan below.
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
              // This pair encloses cursor.
              // We want the innermost, i.e., the one with the 'opening' bracket closer to the cursor (highest start pos),
              // or simply the tightness since we are scanning linear?
              // L1 ... L2 ... R2 ... R1
              // We encounter R2 first. Match L2-R2. Fits. Record.
              // We encounter R1. Match L1-R1. Fits.
              // L2 > L1. So L2-R2 is better.
              // Only replace if new pair is better?
              // In this loop order, we see inner pairs first (usually? No, linear scan).
              // Actually we see R2 before R1.
              // So we find L2-R2 first.
              // We should KEEP L2-R2.
              // So update if `overrides`. But L1 < L2, so L1-R1 is WORSE.
              // So condition: `if (!bestPair || open.from > bestPair.open.from)`

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

      const parserData = view.plugin(typstMatePlugin) as unknown as TypstParserPluginValue | null;
      if (!parserData) return Decoration.none;

      const builder = new RangeSetBuilder<Decoration>();
      const cursor = view.state.selection.main.head;

      for (const region of parserData.parsedRegions) {
        // Find Pair for this region
        const pair = findInnermostPair(region.root, cursor);
        if (pair) {
          const type = getBracketType(pair.open.kind);
          if (type) {
            const cls = `typstmate-bracket-${type} typstmate-bracket-enclosing`;
            builder.add(pair.open.from, pair.open.to, Decoration.mark({ class: cls }));
            builder.add(pair.close.from, pair.close.to, Decoration.mark({ class: cls }));
          }
        }
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations },
);
