import { LinkedNode, SyntaxKind } from '@typstmate/typst-syntax';
import { type Facet, RangeSet, StateEffect } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import symbolData from '@/data/symbols.json';
import { RenderingEngine } from '@/libs/processor';
import { getActiveRegion } from '../../utils/core';
import type { SymbolConcealSettings } from './package';

export const SYMBOL_MAP = new Map<string, string>();
for (const [key, val] of Object.entries(symbolData as Record<string, { sym?: string }>)) {
  if (val.sym) SYMBOL_MAP.set(key, val.sym);
}

// * widget

const widgetCache = new Map<string, SymbolWidget>();

class SymbolWidget extends WidgetType {
  constructor(public symbol: string) {
    super();
  }

  override eq(other: SymbolWidget): boolean {
    return this.symbol === other.symbol;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.className = 'typ-pol';
    span.textContent = this.symbol;

    return span;
  }
}

function getSymbolWidget(symbol: string): SymbolWidget {
  let w = widgetCache.get(symbol);

  if (!w) {
    w = new SymbolWidget(symbol);
    widgetCache.set(symbol, w);
  }

  return w;
}

// * plugin

const forceRevealEffect = StateEffect.define<void>();

export class SymbolConcealPlugin {
  view!: EditorView;
  private settingsFacet!: Facet<SymbolConcealSettings, SymbolConcealSettings>;
  decorations: DecorationSet = Decoration.none;

  forceRevealPos: number = -1;
  hoveredSymbolPos: number = -1;
  revealTimer: number | undefined;

  constructor(view: EditorView, settingsFacet: Facet<SymbolConcealSettings, SymbolConcealSettings>) {
    this.view = view;
    this.settingsFacet = settingsFacet;

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

  private updateDecorations(view: EditorView, isDocChange: boolean, isCursorMove: boolean) {
    const region = getActiveRegion(view);
    const settings = view.state.facet(this.settingsFacet);

    if (!region?.tree || region.processor?.renderingEngine === RenderingEngine.MathJax) {
      this.reset();
      return;
    }

    const cursor = view.state.selection.main.head;
    const offset = region.from + region.skip;

    const marks: ReturnType<Decoration['range']>[] = [];
    let newHoveredPos = -1;
    let isNewlyTyped = false;

    const traverse = (node: LinkedNode) => {
      const kind = node.kind();
      const isMatchable =
        kind === SyntaxKind.MathIdent ||
        kind === SyntaxKind.FieldAccess ||
        kind === SyntaxKind.MathText ||
        kind === SyntaxKind.Ident;

      if (isMatchable) {
        const fullText = node.node.intoText();
        const text = fullText.trim();
        let sym: string | undefined;

        if (kind === SyntaxKind.MathIdent || kind === SyntaxKind.MathText) sym = SYMBOL_MAP.get(text);
        else if (kind === SyntaxKind.FieldAccess) {
          const leftmost = node.leftmostLeaf();
          if (leftmost) {
            const lKind = leftmost.kind();
            if (lKind === SyntaxKind.MathIdent) sym = SYMBOL_MAP.get(text);
            else if (lKind === SyntaxKind.Ident && leftmost.text().trim() === 'sym') {
              const dotIndex = text.indexOf('.');
              if (dotIndex !== -1) sym = SYMBOL_MAP.get(text.slice(dotIndex + 1).trim());
            }
          }
        }

        if (sym) {
          const startWhitespace = fullText.length - fullText.trimStart().length;
          const absStart = offset + node.offset + startWhitespace;
          const absEnd = absStart + text.length;
          const isSelected =
            !view.state.selection.main.empty &&
            view.state.selection.ranges.some((r) => r.from <= absEnd && absStart <= r.to);
          const isNearby = absStart <= cursor && cursor <= absEnd;

          let isConcealed = true;

          if (isSelected) isConcealed = false;
          else if (isNearby) {
            let wasConcealed = false;
            if (this.decorations !== Decoration.none) {
              this.decorations.between(absStart, absEnd, (from, to) => {
                if (from === absStart && to === absEnd) wasConcealed = true;
              });
            }

            if (this.forceRevealPos === absStart) {
              isConcealed = false;
            } else if (wasConcealed) {
              isConcealed = true;
              newHoveredPos = absStart;
            } else {
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

    const delay = Number(settings.revealDelay) || 1000;
    if (newHoveredPos !== -1) {
      if (isNewlyTyped) {
        this.forceRevealPos = newHoveredPos;
        this.clearTimer();
      } else {
        const changedHover = this.hoveredSymbolPos !== newHoveredPos;
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
      this.clearTimer();
      this.hoveredSymbolPos = -1;
      this.forceRevealPos = -1;
    }
  }

  private clearTimer() {
    if (this.revealTimer !== undefined) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = undefined;
    }
  }

  private reset() {
    this.decorations = Decoration.none;
    this.clearTimer();
    this.hoveredSymbolPos = -1;
    this.forceRevealPos = -1;
  }
}

export function createSymbolConcealExtension(settingsFacet: Facet<SymbolConcealSettings, SymbolConcealSettings>) {
  const viewPlugin = ViewPlugin.fromClass(
    class extends SymbolConcealPlugin {
      constructor(view: EditorView) {
        super(view, settingsFacet);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );

  return [
    viewPlugin,
    EditorView.atomicRanges.of((view) => {
      return view.plugin(viewPlugin)?.decorations ?? RangeSet.empty;
    }),
  ];
}
