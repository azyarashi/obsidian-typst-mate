import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { CSSClass, highlight, type SyntaxNode, type SyntaxToken } from '@/utils/rust/crates/typst-synatx';

import { typstMateCore } from '../core/TypstMate';

export const typstSyntaxHighlightExtension: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet)
        this.decorations = this.buildDecorations(update.view);
    }

    buildDecorations(view: EditorView) {
      const parserData = view.plugin(typstMateCore);
      if (!parserData) return Decoration.none;

      const builder = new RangeSetBuilder<Decoration>();

      for (const region of parserData.parsedRegions) this.traverse(region.root, null, 0, [], builder);
      return builder.finish();
    }

    traverse(
      node: SyntaxNode | SyntaxToken,
      parent: SyntaxNode | null,
      index: number,
      siblings: (SyntaxNode | SyntaxToken)[],
      builder: RangeSetBuilder<Decoration>,
    ) {
      const cls = highlight(node, parent, index, siblings) ?? CSSClass.Text;
      if (cls) builder.add(node.from, node.to, Decoration.mark({ class: cls }));

      if (!('children' in node) || !Array.isArray(node.children)) return;

      for (let i = 0; i < node.children.length; i++) this.traverse(node.children[i]!, node, i, node.children, builder);
    }
  },
  { decorations: (v) => v.decorations },
);
