import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { OPEN_MAP, type Token, TypstTokenizer } from '../../utils/tokenizer';
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
      private staticDecorations: DecorationSet = Decoration.none;

      private cachedTokens: Token[] | null = null;
      private cachedBrackets: Token[] | null = null;
      private cachedPairMap: Map<number, number> | null = null;
      private cachedText: string | null = null;
      private cachedRegionFrom = -1;
      private lastEnclosing: { open: number; close: number } | null = null;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged) {
          this.decorations = this.buildDecorations(u.view);
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const helper = view.state.facet(editorHelperFacet);
        if (!helper || helper.plugin.settings.disableBracketHighlight) return Decoration.none;

        const region = getActiveRegion(view);
        if (!region) {
          this.clearCache();
          return Decoration.none;
        }

        const state = view.state;
        const text = state.sliceDoc(region.from, region.to);
        const cursor = state.selection.main.head;
        const relCursor = cursor - region.from;

        // 変更またはリージョンの移動
        let contentChanged = false;
        const regionMoved = this.cachedRegionFrom !== region.from;

        if (text !== this.cachedText) {
          this.cachedTokens = parser.tokenize(text, { includeSym: false });
          this.cachedBrackets = [];

          for (const t of this.cachedTokens) {
            if (t.type === 'bracket') this.cachedBrackets.push(t);
          }

          this.cachedPairMap = this.computePairMap(this.cachedBrackets);
          this.cachedText = text;
          contentChanged = true;
        }

        if (contentChanged || regionMoved) {
          const builder = new RangeSetBuilder<Decoration>();
          for (const t of this.cachedTokens!) {
            if (t.type !== 'sym' && t.type !== 'bracket') {
              const cls = `typstmate-highlight-${t.type}`;
              builder.add(region.from + t.from, region.from + t.to, getMarkDeco(cls));
            }
          }
          this.staticDecorations = builder.finish();
          this.cachedRegionFrom = region.from;
        }

        // 対象の括弧の変更
        let enclosing: { open: number; close: number } | null = null;
        if (region.from <= cursor && cursor <= region.to)
          enclosing = this.findEnclosing(this.cachedBrackets!, this.cachedPairMap!, relCursor);

        // 更新の確認
        const enclosingChanged = !this.areEnclosingEqual(this.lastEnclosing, enclosing);

        if (!contentChanged && !enclosingChanged) return this.decorations;

        this.lastEnclosing = enclosing;

        let decos = this.staticDecorations;
        if (enclosing) {
          const add = [
            getMarkDeco('typstmate-bracket-enclosing').range(
              region.from + enclosing.open,
              region.from + enclosing.open + 1,
            ),
            getMarkDeco('typstmate-bracket-enclosing').range(
              region.from + enclosing.close,
              region.from + enclosing.close + 1,
            ),
          ];

          add.sort((a, b) => a.from - b.from);
          decos = decos.update({ add });
        }

        return decos;
      }

      private clearCache() {
        this.staticDecorations = Decoration.none;
        this.cachedTokens = null;
        this.cachedBrackets = null;
        this.cachedPairMap = null;
        this.cachedText = null;
        this.cachedRegionFrom = -1;
        this.lastEnclosing = null;
      }

      private computePairMap(brackets: Token[]): Map<number, number> {
        const pairMap = new Map<number, number>();
        const stack: Token[] = [];
        for (const b of brackets) {
          if ('([{'.includes(b.text)) stack.push(b);
          else {
            const expected = OPEN_MAP[b.text];
            if (!expected) continue;

            let idx = stack.length - 1;
            while (idx >= 0 && stack[idx]!.text !== expected) idx--;
            if (idx === -1) continue;

            const open = stack[idx]!;
            if (idx === stack.length - 1) stack.pop();
            else stack.splice(idx, 1);

            pairMap.set(open.from, b.from);
            pairMap.set(b.from, open.from);
          }
        }
        return pairMap;
      }

      private findEnclosing(
        brackets: Token[],
        pairMap: Map<number, number>,
        relCursor: number,
      ): { open: number; close: number } | null {
        let enclosing: { open: number; close: number } | null = null;
        for (const b of brackets) {
          if (b.from > relCursor) break;
          if ('([{'.includes(b.text) && pairMap.has(b.from)) {
            const closePos = pairMap.get(b.from)!;
            if (relCursor <= closePos + 1) {
              const dist = closePos - b.from;
              if (!enclosing || dist < enclosing.close - enclosing.open) enclosing = { open: b.from, close: closePos };
            }
          }
        }
        return enclosing;
      }

      private areEnclosingEqual(
        a: { open: number; close: number } | null,
        b: { open: number; close: number } | null,
      ): boolean {
        if (a === b) return true;
        if (!a || !b) return false;
        return a.open === b.open && a.close === b.close;
      }
    },
    { decorations: (v) => v.decorations },
  );
};
