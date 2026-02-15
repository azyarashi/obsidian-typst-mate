import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import * as symbolData from '@/data/symbols.json';

import type { EditorHelper } from '@/editor';
import { TypstTokenizer } from '../../utils/tokenizer';

const SYMBOL_MAP = new Map<string, string>();
const data = (symbolData as any).default || symbolData;
for (const [key, val] of Object.entries(data)) if ((val as any).sym) SYMBOL_MAP.set(key, (val as any).sym);

class SymbolWidget extends WidgetType {
  constructor(public text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'typst-symbol-widget';
    span.textContent = this.text;
    return span;
  }
}

const parser = new TypstTokenizer();

export const createMathSymbolConcealExtension = (helper: EditorHelper): Extension => {
  class MathSymbolConcealPlugin {
    decorations: DecorationSet;
    atomicRanges: any; // RangeSet<any>

    // Delay Reveal State
    activeReveal: { from: number; to: number } | null = null;
    pendingReveal: { from: number; to: number } | null = null;
    revealTimer: number | undefined;

    constructor(public view: EditorView) {
      const { decorations, atomicRanges } = this.buildDecorationsAndAtomicRanges(view);
      this.decorations = decorations;
      this.atomicRanges = atomicRanges;
    }

    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) {
        const { decorations, atomicRanges } = this.buildDecorationsAndAtomicRanges(u.view, u.docChanged);
        this.decorations = decorations;
        this.atomicRanges = atomicRanges;
      }
    }

    destroy() {
      if (this.revealTimer !== undefined) {
        window.clearTimeout(this.revealTimer);
      }
    }

    buildDecorationsAndAtomicRanges(
      view: EditorView,
      isDocChange: boolean = false,
    ): { decorations: DecorationSet; atomicRanges: any } {
      const decorationBuilder = new RangeSetBuilder<Decoration>();
      const atomicRangeBuilder = new RangeSetBuilder<any>();
      const state = view.state;
      const cursor = state.selection.main.head;
      // @ts-expect-error
      const tree = syntaxTree(state);

      const regions: { from: number; to: number; type: 'math' | 'code' }[] = [];
      tree.iterate({
        from: view.viewport.from,
        to: view.viewport.to,
        enter: (node) => {
          const name = node.name.toLowerCase();
          const isMath = name.includes('math');
          const isCode = /codeblock|hmd-code/.test(name);

          if (!isMath && !isCode) return;

          const type = isMath ? 'math' : 'code';

          const last = regions[regions.length - 1];
          if (last && last.type === type && node.from <= last.to + 1) {
            last.to = Math.max(last.to, node.to);
          } else {
            regions.push({ from: node.from, to: node.to, type });
          }
          return false;
        },
      });

      let cursorOnSymbol: { from: number; to: number } | null = null;

      for (const region of regions) {
        if (region.type === 'code') continue;

        const text = state.sliceDoc(region.from, region.to);
        const tokens = parser.tokenize(text);

        for (const t of tokens) {
          if (t.type === 'sym') {
            if (helper.plugin.settings.concealMathSymbols) {
              const sym = SYMBOL_MAP.get(t.text);
              if (sym) {
                const absStart = region.from + t.from;
                const absEnd = region.from + t.to;
                const isNearby = absStart <= cursor && cursor <= absEnd;

                let shouldReveal = false;

                if (isNearby) {
                  cursorOnSymbol = { from: absStart, to: absEnd };

                  if (this.activeReveal && this.activeReveal.from === absStart) shouldReveal = true;
                  else if (isDocChange) shouldReveal = true;
                }

                if (!shouldReveal) {
                  const deco = Decoration.replace({ widget: new SymbolWidget(sym) });
                  decorationBuilder.add(absStart, absEnd, deco);
                  atomicRangeBuilder.add(absStart, absEnd, true);
                }
              }
            }
          }
        }
      }

      const delay = helper.plugin.settings.mathSymbolRevealDelay ?? 0;

      if (cursorOnSymbol) {
        const isSameAsPending = this.pendingReveal && this.pendingReveal.from === cursorOnSymbol.from;
        const isSameAsActive = this.activeReveal && this.activeReveal.from === cursorOnSymbol.from;

        if (!isSameAsActive) {
          if (isDocChange) {
            this.activeReveal = cursorOnSymbol;
            this.pendingReveal = null;
            if (this.revealTimer !== undefined) {
              clearTimeout(this.revealTimer);
              this.revealTimer = undefined;
            }
          } else if (!isSameAsPending) {
            if (this.revealTimer !== undefined) clearTimeout(this.revealTimer);
            this.pendingReveal = cursorOnSymbol;

            this.revealTimer = window.setTimeout(() => {
              this.activeReveal = this.pendingReveal;
              this.pendingReveal = null;
              this.revealTimer = undefined;

              const { decorations, atomicRanges } = this.buildDecorationsAndAtomicRanges(view);
              this.decorations = decorations;
              this.atomicRanges = atomicRanges;
              view.dispatch({});
            }, delay);
          }
        }
      } else {
        if (this.activeReveal || this.pendingReveal) {
          this.activeReveal = null;
          this.pendingReveal = null;
          if (this.revealTimer !== undefined) {
            clearTimeout(this.revealTimer);
            this.revealTimer = undefined;
          }
        }
      }

      return {
        decorations: decorationBuilder.finish(),
        atomicRanges: atomicRangeBuilder.finish(),
      };
    }
  }

  const plugin = ViewPlugin.fromClass(MathSymbolConcealPlugin, {
    decorations: (v) => v.decorations,
  });

  return [
    plugin,
    EditorView.atomicRanges.of((view) => {
      const pluginInstance = view.plugin(plugin);
      return pluginInstance?.atomicRanges ?? new RangeSetBuilder<any>().finish();
    }),
  ];
};
