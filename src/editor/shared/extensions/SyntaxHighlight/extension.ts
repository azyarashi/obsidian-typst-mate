import { highlight, LinkedNode } from '@typstmate/typst-syntax';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { getActiveRegion, type ParsedRegion } from '@/editor';

export function typstSyntaxHighlighting() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private lastRegionFrom: number | null = null;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        const region = getActiveRegion(update.view);
        const regionChanged = region?.from !== this.lastRegionFrom;

        if (update.docChanged || regionChanged) {
          this.decorations = this.buildDecorations(update.view, region);
          this.lastRegionFrom = region?.from ?? null;
        }
      }

      buildDecorations(view: EditorView, region?: ParsedRegion | null): DecorationSet {
        const targetRegion = region ?? getActiveRegion(view);
        if (!targetRegion?.tree) return Decoration.none;

        const tree = targetRegion.tree;
        const offset = targetRegion.from + targetRegion.skip;

        const marks: { from: number; to: number; class: string }[] = [];
        const traverse = (node: LinkedNode) => {
          const cssClass = highlight(node);
          if (cssClass) {
            const start = offset + node.offset;
            const end = offset + node.offset + node.len();
            if (start < end) marks.push({ from: start, to: end, class: cssClass });
          }
          for (const child of node.children()) traverse(child);
        };

        traverse(LinkedNode.new(tree));

        return Decoration.set(
          marks.map((m) => Decoration.mark({ class: m.class }).range(m.from, m.to)),
          true,
        );
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}
