import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { LinkedNode, Side, SyntaxKind } from '@/utils/crates/typst-syntax';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

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
]);

const OPEN_KINDS = new Set([SyntaxKind.LeftParen, SyntaxKind.LeftBracket, SyntaxKind.LeftBrace]);

const CLOSE_KINDS = new Set([SyntaxKind.RightParen, SyntaxKind.RightBracket, SyntaxKind.RightBrace]);

const SYMMETRIC_DELIMS = new Set([SyntaxKind.Dollar]);

export const bracketHighlightExtension = () => {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private lastEnclosing: { open: number; close: number; openLen?: number; closeLen?: number } | null = null;
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
        const helper = view.state.facet(editorHelperFacet);
        if (helper.plugin.settings.disableBracketHighlight) return Decoration.none;

        const region = getActiveRegion(view);
        if (!region || !region.tree) return Decoration.none;

        const cursor = view.state.selection.main.head;
        const offset = region.kind === 'codeblock' ? region.from : region.from + region.skip;
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
                if (OPEN_KINDS.has(kind)) open = child;
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

        if (
          leafAfter &&
          (OPEN_KINDS.has(leafAfter.kind()) ||
            CLOSE_KINDS.has(leafAfter.kind()) ||
            SYMMETRIC_DELIMS.has(leafAfter.kind()) ||
            leafAfter.kind() === SyntaxKind.BlockComment)
        ) {
          enclosing = findEnclosingBrackets(leafAfter);
        } else if (
          leafBefore &&
          (OPEN_KINDS.has(leafBefore.kind()) ||
            CLOSE_KINDS.has(leafBefore.kind()) ||
            SYMMETRIC_DELIMS.has(leafBefore.kind()) ||
            leafBefore.kind() === SyntaxKind.BlockComment)
        )
          enclosing = findEnclosingBrackets(leafBefore);
        else enclosing = findEnclosingBrackets(leafAfter || leafBefore);

        if (!enclosing) {
          this.lastEnclosing = null;
          return Decoration.none;
        }

        const openLen = enclosing.openLen || 1;
        const closeLen = enclosing.closeLen || 1;

        if (
          !this.lastEnclosing ||
          this.lastEnclosing.open !== enclosing.open ||
          this.lastEnclosing.close !== enclosing.close ||
          this.lastEnclosing.openLen !== openLen ||
          this.lastEnclosing.closeLen !== closeLen
        ) {
          const builder = new RangeSetBuilder<Decoration>();
          const openDeco = getMarkDeco('typstmate-bracket-pair typstmate-bracket-pair-open');
          const closeDeco = getMarkDeco('typstmate-bracket-pair typstmate-bracket-pair-close');

          builder.add(offset + enclosing.open, offset + enclosing.open + openLen, openDeco);
          builder.add(offset + enclosing.close, offset + enclosing.close + closeLen, closeDeco);

          this.lastEnclosing = { ...enclosing, openLen, closeLen };
          return builder.finish();
        }

        return this.decorations;
      }
    },
    { decorations: (v) => v.decorations },
  );
};
