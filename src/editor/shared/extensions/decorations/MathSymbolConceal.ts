import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import * as symbolData from '@/data/symbols.json';
import { RenderingEngine } from '@/libs/processor';
import { TypstTokenizer } from '../../utils/tokenizer';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

const SYMBOL_MAP = new Map<string, string>();
const data = (symbolData as any).default || symbolData;
for (const [key, val] of Object.entries(data)) if ((val as any).sym) SYMBOL_MAP.set(key, (val as any).sym);

const widgetCache = new Map<string, SymbolWidget>();

class SymbolWidget extends WidgetType {
  constructor(public text: string) {
    super();
  }

  override eq(other: SymbolWidget): boolean {
    return this.text === other.text;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.className = 'typst-symbol-widget';
    span.textContent = this.text;
    return span;
  }
}

function getSymbolWidget(text: string): SymbolWidget {
  let w = widgetCache.get(text);
  if (!w) {
    w = new SymbolWidget(text);
    widgetCache.set(text, w);
  }
  return w;
}

const parser = new TypstTokenizer();

class MathSymbolConcealPlugin {
  decorations: DecorationSet;
  atomicRanges: any;

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
    const helper = view.state.facet(editorHelperFacet);
    if (!helper) return { decorations: Decoration.none, atomicRanges: new RangeSetBuilder<any>().finish() };

    const region = getActiveRegion(view);
    if (!region) return { decorations: Decoration.none, atomicRanges: new RangeSetBuilder<any>().finish() };
    if (region.processor && region.processor.renderingEngine !== RenderingEngine.MathJax)
      return { decorations: Decoration.none, atomicRanges: new RangeSetBuilder<any>().finish() };

    const decorationBuilder = new RangeSetBuilder<Decoration>();
    const atomicRangeBuilder = new RangeSetBuilder<any>();
    const state = view.state;
    const cursor = state.selection.main.head;

    const text = state.sliceDoc(region.from, region.to);
    const tokens = parser.tokenize(text);
    const symTokens = [];
    for (const t of tokens) if (t.type === 'sym') symTokens.push({ from: t.from, to: t.to, text: t.text });
    const cachedRegionFrom = region.from;

    let cursorOnSymbol: { from: number; to: number } | null = null;

    const conceal = helper.plugin.settings.concealMathSymbols;
    if (conceal) {
      for (const t of symTokens) {
        const sym = SYMBOL_MAP.get(t.text);
        if (sym) {
          const absStart = cachedRegionFrom + t.from;
          const absEnd = cachedRegionFrom + t.to;
          const isNearby = absStart <= cursor && cursor <= absEnd;

          let shouldReveal = false;

          if (isNearby) {
            cursorOnSymbol = { from: absStart, to: absEnd };

            if (this.activeReveal && this.activeReveal.from === absStart) shouldReveal = true;
            else if (isDocChange) shouldReveal = true;
          }

          if (!shouldReveal) {
            const deco = Decoration.replace({ widget: getSymbolWidget(sym) });
            decorationBuilder.add(absStart, absEnd, deco);
            atomicRangeBuilder.add(absStart, absEnd, true);
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

const mathSymbolConcealPlugin = ViewPlugin.fromClass(MathSymbolConcealPlugin, {
  decorations: (v) => v.decorations,
});

export const mathSymbolConcealExtension = [
  mathSymbolConcealPlugin,
  EditorView.atomicRanges.of((view) => {
    const pluginInstance = view.plugin(mathSymbolConcealPlugin);
    return pluginInstance?.atomicRanges ?? new RangeSetBuilder<any>().finish();
  }),
];
