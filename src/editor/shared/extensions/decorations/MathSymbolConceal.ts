import { RangeSet, StateEffect } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import symbolData from '@/data/symbols.json';
import { LinkedNode, SyntaxKind } from '@/utils/crates/typst-syntax';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

export const SYMBOL_MAP = new Map<string, string>();
for (const [key, val] of Object.entries(symbolData as Record<string, { sym?: string }>)) {
  if (val.sym) SYMBOL_MAP.set(key, val.sym);
}

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
  decorations: DecorationSet = Decoration.none;

  forceRevealPos: number = -1;
  hoveredSymbolPos: number = -1;
  revealTimer: number | undefined;

  constructor(public view: EditorView) {
    this.updateDecorations(view, false, false);
  }

  update(u: ViewUpdate) {
    if (u.docChanged) {
      if (this.forceRevealPos !== -1) this.forceRevealPos = u.changes.mapPos(this.forceRevealPos);
      if (this.hoveredSymbolPos !== -1) this.hoveredSymbolPos = u.changes.mapPos(this.hoveredSymbolPos);
    }

    const hasRevealEffect = u.transactions.some((tr) => tr.effects.some((e) => e.is(forceRevealEffect)));

    if (u.docChanged || u.selectionSet || u.viewportChanged || hasRevealEffect)
      this.updateDecorations(u.view, u.docChanged, u.selectionSet);
  }

  destroy() {
    this.clearTimer();
  }

  private clearTimer() {
    if (this.revealTimer !== undefined) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = undefined;
    }
  }

  private updateDecorations(view: EditorView, isDocChange: boolean, isCursorMove: boolean) {
    const region = getActiveRegion(view);
    const helper = view.state.facet(editorHelperFacet);
    const conceal = helper.plugin.settings.concealMathSymbols;

    if (!region || !region.tree || !conceal) {
      this.decorations = Decoration.none;
      this.clearTimer();
      this.hoveredSymbolPos = -1;
      this.forceRevealPos = -1;
      return;
    }

    const cursor = view.state.selection.main.head;
    const offset = region.kind === 'codeblock' ? region.from : region.from + region.skip;

    const marks: ReturnType<Decoration['range']>[] = [];
    let newHoveredPos = -1;
    let isNewlyTyped = false;

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

          let isConcealed = true;

          if (isNearby) {
            let wasConcealed = false;
            if (this.decorations !== Decoration.none) {
              this.decorations.between(absStart, absEnd, (from, to) => {
                if (from === absStart && to === absEnd) wasConcealed = true;
              });
            }

            if (this.forceRevealPos === absStart) {
              // タイマーによってRevealが指示されている場合
              isConcealed = false;
            } else if (wasConcealed) {
              // 前回Concealされており、今回カーソルが乗った場合
              isConcealed = true;
              newHoveredPos = absStart;
            } else {
              // 文字入力などによって新たにSymbolが完成した場合
              isConcealed = false;
              newHoveredPos = absStart;
              isNewlyTyped = true;
            }
          }

          if (isConcealed) {
            const deco = Decoration.replace({ widget: getSymbolWidget(sym) });
            marks.push(deco.range(absStart, absEnd));
          }
          return;
        }
      }
      for (const child of node.children()) traverse(child);
    };

    traverse(LinkedNode.new(region.tree));

    this.decorations = Decoration.set(marks, true);

    const delay = Number(helper.plugin.settings.mathSymbolRevealDelay) || 1000;

    if (newHoveredPos !== -1) {
      if (isNewlyTyped) {
        // 入力時は Reveal
        this.forceRevealPos = newHoveredPos;
        this.clearTimer();
      } else {
        const changedHover = this.hoveredSymbolPos !== newHoveredPos;
        // ホバー対象の変更, カーソルの移動
        if (changedHover || isCursorMove || isDocChange) {
          this.clearTimer();
          this.hoveredSymbolPos = newHoveredPos;

          this.revealTimer = window.setTimeout(() => {
            this.forceRevealPos = newHoveredPos;
            view.dispatch({ effects: forceRevealEffect.of() });
          }, delay);
        }
      }
    } else {
      // シンボル外にカーソルが移動
      this.clearTimer();
      this.hoveredSymbolPos = -1;
      this.forceRevealPos = -1;
    }
  }
}

export const mathSymbolConcealPlugin = ViewPlugin.fromClass(MathSymbolConcealPlugin, {
  decorations: (v) => v.decorations,
});

export const mathSymbolConcealExtension = [
  mathSymbolConcealPlugin,
  EditorView.atomicRanges.of((view) => {
    return view.plugin(mathSymbolConcealPlugin)?.decorations ?? RangeSet.empty;
  }),
];
