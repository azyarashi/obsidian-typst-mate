import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import './IndentRainbow.css';

const COLORS_COUNT = 6;
const indentRainbowColors = Array.from({ length: COLORS_COUNT }, (_, i) =>
  Decoration.mark({ class: `cm-indent-rainbow cm-indent-rainbow-${i}` }),
);

export const indentRainbowExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDeco(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.buildDeco(update.view);
    }

    private buildDeco(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const tabSize = view.state.tabSize;

      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos < to) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;

          if (text.length > 0 && text.trim().length === 0) {
            pos = line.to + 1;
            continue;
          }
          const match = text.match(/^[ \t]+/);
          if (match) {
            const whitespace = match[0];
            let visualCol = 0;

            for (let i = 0; i < whitespace.length; i++) {
              const char = whitespace[i];
              const startPos = line.from + i;

              const indentLevel = Math.floor(visualCol / tabSize);
              const deco = indentRainbowColors[indentLevel % COLORS_COUNT];

              if (char === '\t') {
                builder.add(startPos, startPos + 1, deco!);
                visualCol += tabSize - (visualCol % tabSize);
              } else {
                builder.add(startPos, startPos + 1, deco!);
                visualCol++;
              }
            }
          }
          pos = line.to + 1;
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
