import { type Extension, RangeSet, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  EditorView as EV,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import symbolData from '@/data/symbols.json';
import { SyntaxKind, SyntaxMode, type SyntaxToken } from '@/utils/rust/crates/typst-syntax';

import { getActiveRegion, typstMateCore } from '../core/TypstMate';

const SYMBOL_MAP = new Map<string, string>();
for (const [key, val] of Object.entries(symbolData)) {
  if (val.sym) SYMBOL_MAP.set(key, val.sym);
}

class SymbolWidget extends WidgetType {
  constructor(public text: string) {
    super();
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'typst-symbol-widget typ-pol';
    span.textContent = this.text;
    return span;
  }
}

const matchSymbolChain = (tokens: SyntaxToken[], startIndex: number): { sym: string; usedTokens: number } | null => {
  const t = tokens[startIndex];
  if (!t) return null;
  const mode = t.mode;
  if (!mode) return null;

  let chainText = '';

  switch (mode) {
    case SyntaxMode.Math:
      if (t.kind !== SyntaxKind.MathIdent) return null;
      chainText = t.text;
      break;
    case SyntaxMode.Code:
      if (t.text !== 'sym' || t.kind !== SyntaxKind.Ident) return null;
      chainText = 'sym';
      break;
    default:
      return null;
  }

  // ドットチェーンの収集
  let offset = 0;
  while (startIndex + offset + 2 < tokens.length) {
    const dot = tokens[startIndex + offset + 1]!;
    const next = tokens[startIndex + offset + 2]!;

    if (dot.text !== '.') break;
    if (next.mode !== mode) break;

    const isValidNext = mode === SyntaxMode.Math ? next.kind === SyntaxKind.MathIdent : next.kind === SyntaxKind.Ident;

    if (!isValidNext) break;

    chainText += `.${next.text}`;
    offset += 2;
  }

  // 最大一致
  const parts = chainText.split('.');
  const searchParts = mode === SyntaxMode.Code ? parts.slice(1) : parts;

  if (searchParts.length === 0) return null;

  for (let len = searchParts.length; len > 0; len--) {
    const subKey = searchParts.slice(0, len).join('.');
    if (SYMBOL_MAP.has(subKey)) {
      const sym = SYMBOL_MAP.get(subKey)!;
      const matchedPartCount = mode === SyntaxMode.Code ? len + 1 : len;
      // Tokens = parts + dots
      const usedTokens = Math.max(1, matchedPartCount * 2 - 1);
      return { sym, usedTokens };
    }
  }

  return null;
};

import { editorHelperFacet } from '../core/Helper';

const mathSymbolConcealPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    atomicRanges: RangeSet<any>;
    revealedRange: { from: number; to: number } | null = null;
    revealTimer: number | null = null;
    pendingRange: { from: number; to: number } | null = null; // リビール待ちの範囲
    forceUpdate = false;

    constructor(view: EditorView) {
      this.decorations = Decoration.none;
      this.atomicRanges = RangeSet.empty;
      this.recompute(view);
    }

    update(u: ViewUpdate) {
      let isInsertion = false;
      if (u.docChanged) {
        u.changes.iterChanges((_fromA, _toA, _fromB, _toB, text) => {
          if (text.length > 0) isInsertion = true;
        });
      }

      if (u.docChanged || u.viewportChanged || u.selectionSet || this.forceUpdate) {
        this.forceUpdate = false;
        this.recompute(u.view, isInsertion);
      }
    }

    recompute(view: EditorView, docChanged: boolean = false) {
      const { decorations, atomicRanges, hoveringRange } = this.computeDecorations(view, docChanged);
      this.decorations = decorations;
      this.atomicRanges = atomicRanges;
      this.handleHover(view, hoveringRange, docChanged);
    }

    handleHover(view: EditorView, hovering: { from: number; to: number } | null, docChanged: boolean) {
      const helper = view.state.facet(editorHelperFacet);
      const delay = helper?.plugin.settings.mathSymbolRevealDelay ?? 200;

      // 1. 何もホバーしていない場合
      if (!hovering) {
        if (this.revealedRange || this.revealTimer) {
          this.revealedRange = null;
          this.pendingRange = null;
          if (this.revealTimer) {
            window.clearTimeout(this.revealTimer);
            this.revealTimer = null;
          }
          // 直ちに隠蔽（conceal）
          const { decorations, atomicRanges } = this.computeDecorations(view, false);
          this.decorations = decorations;
          this.atomicRanges = atomicRanges;
        }
        return;
      }

      // docChangedの場合、直ちにリビール（リビール状態を維持）
      if (docChanged) {
        this.revealedRange = hovering;
        this.pendingRange = null;
        if (this.revealTimer) {
          window.clearTimeout(this.revealTimer);
          this.revealTimer = null;
        }
        // computeDecorationsですでにdocChangedを考慮しているので、decorationsは正しい（リビール状態）
        return;
      }

      // 2. すでにリビールされた範囲をホバーしている場合
      if (this.revealedRange && hovering.from === this.revealedRange.from && hovering.to === this.revealedRange.to) {
        if (this.revealTimer) {
          window.clearTimeout(this.revealTimer);
          this.revealTimer = null;
          this.pendingRange = null;
        }
        return;
      }

      // 3. 新しい範囲をホバーしている場合（リビールが必要）
      if (this.pendingRange && hovering.from === this.pendingRange.from && hovering.to === this.pendingRange.to) {
        return;
      }

      // 新しいタイマーを開始
      if (this.revealTimer) {
        window.clearTimeout(this.revealTimer);
      }
      this.pendingRange = hovering;
      this.revealTimer = window.setTimeout(() => {
        if (view.isDestroyed) return;
        this.revealedRange = this.pendingRange;
        this.pendingRange = null;
        this.revealTimer = null;
        this.forceUpdate = true;
        view.dispatch({ effects: [] });
      }, delay);
    }

    computeDecorations(view: EditorView, docChanged: boolean) {
      const helper = view.state.facet(editorHelperFacet);
      if (!helper || !helper.plugin.settings.concealMathSymbols) {
        return { decorations: Decoration.none, atomicRanges: RangeSet.empty, hoveringRange: null };
      }

      const parserData = view.plugin(typstMateCore);
      if (!parserData) return { decorations: Decoration.none, atomicRanges: RangeSet.empty, hoveringRange: null };

      const builder = new RangeSetBuilder<Decoration>();
      const atomicBuilder = new RangeSetBuilder<any>();
      const cursor = view.state.selection.main.head;

      let hoveringRange: { from: number; to: number } | null = null;

      const region = getActiveRegion(view);
      if (!region) return { decorations: Decoration.none, atomicRanges: RangeSet.empty, hoveringRange: null };
      const tokens = region.tokens;
      let i = 0;
      while (i < tokens.length) {
        const match = matchSymbolChain(tokens, i);
        if (match) {
          const startT = tokens[i]!;
          const endT = tokens[i + match.usedTokens - 1]!;

          const isOverlapping = cursor >= startT.from && cursor <= endT.to;

          if (isOverlapping) {
            hoveringRange = { from: startT.from, to: endT.to };
          }

          // 隠蔽（conceal）するか決定
          let shouldConceal = true;

          if (this.revealedRange && startT.from === this.revealedRange.from && endT.to === this.revealedRange.to) {
            shouldConceal = false;
          }

          // ホバー中かつdocChanged（入力中）の場合、直ちにリビール
          if (isOverlapping && docChanged) {
            shouldConceal = false;
          }

          // 空でない選択範囲に含まれる場合、直ちにリビール
          if (shouldConceal) {
            for (const range of view.state.selection.ranges) {
              if (!range.empty && range.from <= endT.to && range.to >= startT.from) {
                shouldConceal = false;
                break;
              }
            }
          }

          if (shouldConceal) {
            const deco = Decoration.replace({ widget: new SymbolWidget(match.sym) });
            builder.add(startT.from, endT.to, deco);
            atomicBuilder.add(startT.from, endT.to, Decoration.mark({}));
          }

          i += match.usedTokens;
        } else {
          i++;
        }
      }
      return {
        decorations: builder.finish(),
        atomicRanges: atomicBuilder.finish(),
        hoveringRange,
      };
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export const mathSymbolConcealExtension: Extension = [
  mathSymbolConcealPlugin,
  EV.atomicRanges.of((view) => {
    const p = view.plugin(mathSymbolConcealPlugin);
    return p?.atomicRanges ?? RangeSet.empty;
  }),
];
