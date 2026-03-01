import { RangeSet, RangeSetBuilder, StateEffect } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import symbolData from '@/data/symbols.json';
import { LinkedNode, SyntaxKind } from '@/utils/crates/typst-syntax';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

export const SYMBOL_MAP = new Map<string, string>();
for (const [key, val] of Object.entries(symbolData as Record<string, { sym?: string }>))
  if (val.sym) SYMBOL_MAP.set(key, val.sym);

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
    span.className = 'typ-pol';
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

const forceRevealEffect = StateEffect.define<void>();

class MathSymbolConcealPlugin {
  decorations: DecorationSet;

  forceRevealPos: number = -1;
  hoveredSymbolPos: number = -1;
  revealTimer: number | undefined;
  forceRebuild: boolean = false;

  constructor(public view: EditorView) {
    this.decorations = this.buildDecorations(view, Decoration.none, false, false);
  }

  update(u: ViewUpdate) {
    let prevDecos = this.decorations;
    if (u.docChanged) prevDecos = prevDecos.map(u.changes);

    let cursorMoved = false;
    if (u.selectionSet) cursorMoved = true;

    let hasRevealEffect = false;
    for (const tr of u.transactions) {
      if (tr.effects.some((e) => e.is(forceRevealEffect))) {
        hasRevealEffect = true;
      }
    }

    if (u.docChanged || u.selectionSet || u.viewportChanged || this.forceRebuild || hasRevealEffect) {
      if (this.forceRebuild) this.forceRebuild = false;
      this.decorations = this.buildDecorations(u.view, prevDecos, cursorMoved, u.docChanged);
    }
  }

  destroy() {
    if (this.revealTimer !== undefined) {
      window.clearTimeout(this.revealTimer);
    }
  }

  buildDecorations(
    view: EditorView,
    prevDecos: DecorationSet,
    cursorMoved: boolean,
    isDocChange: boolean,
  ): DecorationSet {
    const region = getActiveRegion(view);
    if (!region || !region.tree) return Decoration.none;

    const helper = view.state.facet(editorHelperFacet);

    const decorationBuilder = new RangeSetBuilder<Decoration>();
    const state = view.state;
    const cursor = state.selection.main.head;

    const offset = region.kind === 'codeblock' ? region.from : region.from + region.skip;
    let newHoveredPos = -1;

    const conceal = helper.plugin.settings.concealMathSymbols;
    if (conceal) {
      const traverse = (node: LinkedNode) => {
        const kind = node.kind();
        const isMatchable =
          kind === SyntaxKind.MathIdent || kind === SyntaxKind.FieldAccess || kind === SyntaxKind.MathText;

        if (isMatchable) {
          const fullText = node.node.intoText();
          const text = fullText.trim();
          const sym = SYMBOL_MAP.get(text);
          if (sym) {
            const startWhitespace = fullText.length - fullText.trimStart().length;
            const absStart = offset + node.offset + startWhitespace;
            const absEnd = absStart + text.length;
            const isNearby = absStart <= cursor && cursor <= absEnd;

            // 1. Symbolは普通、Concealされる。
            let isConcealed = true;
            if (isNearby) {
              let wasConcealed = false;
              // 打つ, または削除してSymbolが完成した場合は Conceal しない
              if (prevDecos !== Decoration.none) {
                prevDecos.between(absStart, absEnd, (from, to) => {
                  if (from === absStart && to === absEnd) wasConcealed = true;
                });
              }

              // カーソルがSymbol箇所に一定の時間留まっている場合はRevealが起きる
              if (this.forceRevealPos === absStart) isConcealed = false;
              else if (wasConcealed) {
                isConcealed = true;
                newHoveredPos = absStart;
              } else isConcealed = false; // 打つ, または削除してSymbolが完成した場合は Conceal しない
            }

            if (isConcealed) {
              const deco = Decoration.replace({ widget: getSymbolWidget(sym) });
              decorationBuilder.add(absStart, absEnd, deco);
            }
            return;
          }
        }

        for (const child of node.children()) traverse(child);
      };

      traverse(LinkedNode.new(region.tree));
    }

    let delay = helper.plugin.settings.mathSymbolRevealDelay;
    if (typeof delay !== 'number' || Number.isNaN(delay)) delay = 1000;

    if (newHoveredPos !== -1) {
      const changedHover = this.hoveredSymbolPos !== newHoveredPos;
      // 一定の時間は以下の場合に初期化される:
      // - Symbol箇所内でカーソルが移動した場合 (changedHover || cursorMoved || isDocChange)
      if (changedHover || cursorMoved || isDocChange) {
        if (this.revealTimer !== undefined) clearTimeout(this.revealTimer);
        this.hoveredSymbolPos = newHoveredPos;
        this.revealTimer = window.setTimeout(() => {
          this.forceRevealPos = this.hoveredSymbolPos;
          this.forceRebuild = true;
          view.dispatch({ effects: forceRevealEffect.of() });
        }, delay);
      }
    } else {
      if (this.hoveredSymbolPos !== -1 || this.forceRevealPos !== -1) {
        this.hoveredSymbolPos = -1;
        this.forceRevealPos = -1;
        if (this.revealTimer !== undefined) {
          clearTimeout(this.revealTimer);
          this.revealTimer = undefined;
        }
      }
    }

    return decorationBuilder.finish();
  }
}

const mathSymbolConcealPlugin = ViewPlugin.fromClass(MathSymbolConcealPlugin, {
  decorations: (v) => v.decorations,
});

export const mathSymbolConcealExtension = [
  mathSymbolConcealPlugin,
  // Concealされている間、その右隣のカーソルから削除された場合、そのSymbolごと削除したり、左矢印を押した場合Symbolをスキップできる
  EditorView.atomicRanges.of((view) => {
    return view.plugin(mathSymbolConcealPlugin)?.decorations ?? RangeSet.empty;
  }),
];
