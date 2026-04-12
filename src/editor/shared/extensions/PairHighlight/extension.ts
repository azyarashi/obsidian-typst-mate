import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { LinkedNode, Side, SyntaxKind } from '@typstmate/typst-syntax';
import { EditorContextFacet, settingsManager } from '@/libs';
import { getActiveRegion } from '../../utils/core';

const decoCache = new Map<string, Decoration>();
function getMarkDeco(cls: string): Decoration {
  let d = decoCache.get(cls);
  if (!d) {
    d = Decoration.mark({ class: cls });
    decoCache.set(cls, d);
  }
  return d;
}

const ENCLOSING_KINDS = new Set([
  SyntaxKind.Parenthesized,
  SyntaxKind.Array,
  SyntaxKind.Dict,
  SyntaxKind.CodeBlock,
  SyntaxKind.ContentBlock,
  SyntaxKind.MathDelimited,
  SyntaxKind.Equation,
  SyntaxKind.Args,
  SyntaxKind.Params,
  SyntaxKind.Destructuring,
]);

const OPEN_KINDS = new Set([SyntaxKind.LeftParen, SyntaxKind.LeftBracket, SyntaxKind.LeftBrace]);
const CLOSE_KINDS = new Set([SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace]);
const SYMMETRIC_DELIMS = new Set([SyntaxKind.Dollar]);

export const pairHighlightExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;
    private lastCursor: number = -1;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(u: ViewUpdate) {
      const cursor = u.state.selection.main.head;
      if (u.docChanged || u.selectionSet || u.viewportChanged || cursor !== this.lastCursor) {
        this.decorations = this.buildDecorations(u.view);
        this.lastCursor = cursor;
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const context = view.state.facet(EditorContextFacet);
      const setting = settingsManager.settings.extensionSettings[context]['pair-highlight'];

      const enabled = setting?.enabled ?? true;
      if (!enabled) return Decoration.none;

      const region = getActiveRegion(view);
      if (!region?.tree) return Decoration.none;

      const cursor = view.state.selection.main.head;
      const offset = region.from + region.skip;
      const relCursor = cursor - offset;

      const linked = LinkedNode.new(region.tree);
      const leafAfter = linked.leafAt(relCursor, Side.After);
      const leafBefore = linked.leafAt(relCursor, Side.Before);

      let enclosing: { open: number; close: number; openLen?: number; closeLen?: number } | null = null;

      const findEnclosingBrackets = (leaf: LinkedNode | undefined) => {
        if (!leaf) return null;
        let curr: LinkedNode | undefined = leaf;

        if (leaf.kind() === SyntaxKind.BlockComment) {
          const text = leaf.node.intoText();
          if (text.startsWith('/*') && text.endsWith('*/') && text.length >= 4)
            return { open: leaf.offset, openLen: 2, close: leaf.offset + leaf.len() - 2, closeLen: 2 };
        }

        while (curr) {
          if (ENCLOSING_KINDS.has(curr.kind())) {
            const children = curr.children();
            let open: LinkedNode | undefined;
            let close: LinkedNode | undefined;

            for (const child of children) {
              const kind = child.kind();

              if (OPEN_KINDS.has(kind) && !open) open = child;
              if (CLOSE_KINDS.has(kind)) close = child;

              if (SYMMETRIC_DELIMS.has(kind)) {
                if (!open) open = child;
                else close = child;
              }
            }
            if (open && close)
              return { open: open.offset, openLen: open.len(), close: close.offset, closeLen: close.len() };
          }
          curr = curr.parent;
        }
        return null;
      };

      enclosing = findEnclosingBrackets(leafAfter || leafBefore);

      if (!enclosing) return Decoration.none;

      const openLen = enclosing.openLen || 1;
      const closeLen = enclosing.closeLen || 1;

      if (relCursor < enclosing.open + openLen || relCursor > enclosing.close) return Decoration.none;

      const openDeco = getMarkDeco('typstmate-bracket-pair typstmate-bracket-pair-open');
      const closeDeco = getMarkDeco('typstmate-bracket-pair typstmate-bracket-pair-close');

      const fromA = offset + enclosing.open;
      const toA = fromA + openLen;
      const fromB = offset + enclosing.close;
      const toB = fromB + closeLen;

      return Decoration.set([openDeco.range(fromA, toA), closeDeco.range(fromB, toB)], true);
    }
  },
  { decorations: (v) => v.decorations },
);
