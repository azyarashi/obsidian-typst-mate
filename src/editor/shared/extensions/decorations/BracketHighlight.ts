import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { BRACKET_MAP, OPEN_MAP, type Token, TypstTokenizer } from '../../utils/tokenizer';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

import './BracketHighlight.css';

const parser = new TypstTokenizer();

const decoCache = new Map<string, Decoration>();
function getMarkDeco(cls: string): Decoration {
  let d = decoCache.get(cls);
  if (!d) {
    d = Decoration.mark({ class: cls });
    decoCache.set(cls, d);
  }
  return d;
}

export const bracketHighlightExtension = () => {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      private cachedTokens: Token[] | null = null;
      private cachedBrackets: Token[] | null = null;
      private cachedPairMap: Map<number, number> | null = null;
      private cachedRegionFrom = -1;
      private cachedRegionTo = -1;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = this.buildDecorations(u.view);
      }

      buildDecorations(view: EditorView): DecorationSet {
        const helper = view.state.facet(editorHelperFacet);
        if (!helper || helper.plugin.settings.disableBracketHighlight) return Decoration.none;

        const region = getActiveRegion(view);
        if (!region) return Decoration.none;

        const builder = new RangeSetBuilder<Decoration>();
        const state = view.state;
        const cursor = state.selection.main.head;

        if (this.cachedTokens === null || this.cachedRegionFrom !== region.from || this.cachedRegionTo !== region.to) {
          const text = state.sliceDoc(region.from, region.to);
          this.cachedTokens = parser.tokenize(text);
          this.cachedBrackets = this.cachedTokens.filter((t) => t.type === 'bracket');
          const pairMap = new Map<number, number>();
          const stack: Token[] = [];
          for (const b of this.cachedBrackets) {
            if ('([{'.includes(b.text)) stack.push(b);
            else {
              const expected = OPEN_MAP[b.text];
              if (!expected) continue;
              const idx = stack.findLastIndex((s) => s.text === expected);
              if (idx === -1) continue;
              const open = stack.splice(idx, 1)[0];
              if (!open) continue;
              pairMap.set(open.from, b.from);
              pairMap.set(b.from, open.from);
            }
          }
          this.cachedPairMap = pairMap;
          this.cachedRegionFrom = region.from;
          this.cachedRegionTo = region.to;
        }

        const tokens = this.cachedTokens!;
        const brackets = this.cachedBrackets!;
        const pairMap = this.cachedPairMap!;

        let enclosing: { open: number; close: number } | null = null;
        if (region.from <= cursor && cursor <= region.to) {
          const relCursor = cursor - region.from;
          for (const b of brackets) {
            if ('([{'.includes(b.text) && pairMap.has(b.from)) {
              const closePos = pairMap.get(b.from);
              if (closePos !== undefined && b.from <= relCursor && relCursor <= closePos + 1) {
                const dist = closePos - b.from;
                if (!enclosing || dist < enclosing.close - enclosing.open)
                  enclosing = { open: b.from, close: closePos };
              }
            }
          }
        }

        for (const t of tokens) {
          const absFrom = region.from + t.from;
          const absTo = region.from + t.to;

          if (t.type === 'bracket') {
            const kind = BRACKET_MAP[t.text] || 'paren';
            let cls = `typstmate-bracket-${kind}`;
            if (enclosing && (t.from === enclosing.open || t.from === enclosing.close))
              cls += ' typstmate-bracket-enclosing';
            builder.add(absFrom, absTo, getMarkDeco(cls));
          } else if (t.type === 'sym') {
          } else {
            const cls = `typstmate-highlight-${t.type}`;
            builder.add(absFrom, absTo, getMarkDeco(cls));
          }
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
};
