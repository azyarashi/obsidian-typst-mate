import { SyntaxKind, SyntaxMode } from '@typstmate/typst-syntax';
import { Prec } from '@codemirror/state';
import { type EditorView, keymap, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { setIcon } from 'obsidian';
import type { Completion, CompletionKind } from '@/../pkg/typst_wasm';
import SYMBOLS_BY_NAME from '@/data/symbols.json';
import {
  calculatePopOverPositionByCursor,
  getActiveRegion,
  type ParsedRegion,
  Snippet,
  type SymbolData,
  searchSymbols,
} from '@/editor';
import { typstManager } from '@/libs';
import { tmActionsManager } from '@/libs/tmActionsManager';
import { format } from '@/ui/elements/Typst';
import { checkActionContext, executeAction, resolveActionContext } from '../TypstMateActions/actions';
import { autocompleteSettingsFacet } from './package';

import './Autocomplete.css';

const symbolRegexForLatex = /(\\[a-zA-Z]{2,})$/;

const kindToIcon: Record<CompletionKind, string> = {
  func: 'square-function',
  type: 'box',
  param: 'at-sign',
  constant: 'hash',

  font: 'type',
  path: 'file',
  package: 'package',

  label: 'tag',

  symbol: 'asterisk',

  syntax: 'code',
};

function resolveApply(template: string): { text: string; anchorOffset: number; headOffset: number } {
  const snippet = Snippet.parse(template);
  const text = snippet.lines.join('\n');
  let anchorOffset = text.length;
  let headOffset = text.length;

  const firstFieldPos = snippet.tabStops.find((p) => p.level === 0) ?? snippet.tabStops[0];
  if (firstFieldPos) {
    let pos = 0;
    for (let i = 0; i < firstFieldPos.line; i++) pos += snippet.lines[i]!.length + 1;
    anchorOffset = pos + firstFieldPos.from;
    headOffset = pos + firstFieldPos.to;
  }

  return { text, anchorOffset, headOffset };
}

/** rgb(#000000) -> 000000 */
const rgbDetailRegex = /^rgb\("#([0-9a-f]{6})"\)$/;
/** luma(66.67%) -> 66.67 */
const lumaDetailRegex = /^luma\((\d+(?:\.\d+)?)%\)$/;
function extractColor(detail?: string): string | null {
  if (!detail) return null;

  const mRgb = detail.match(rgbDetailRegex);
  if (mRgb) return `#${mRgb[1]}`;

  const mLuma = detail.match(lumaDetailRegex);
  if (mLuma) {
    const percent = parseFloat(mLuma[1]!);
    const v = Math.round((percent / 100) * 255);
    const hex = Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }

  return null;
}

export class AutocompletePlugin implements PluginValue {
  private container: HTMLElement;
  private items: HTMLElement;

  isActive = false;

  /** 補完の開始位置 */
  from = 0;
  /** 現在のカーソル または 最後に適用されたカーソルの位置 */
  to = 0;
  private lastRequestId = 0;
  allCandidates: (Completion & { labelLow?: string })[] = [];
  // フィルターされたもの
  candidates: (Completion & { labelLow?: string })[] = [];
  selectedIndex = -1;

  private hasState = false;

  private isApplyingCompletion = false;
  private isCycling = false;
  private lastPositionAbove = false;

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-autocomplete');

    this.items = this.container.createDiv('items');

    view.dom.appendChild(this.container);

    window.addEventListener('keydown', this.onKeyDownCapture, true);
  }

  update(update: ViewUpdate) {
    if (this.isApplyingCompletion) return;

    if (update.view.composing) {
      if (this.isActive) this.reset();
      return;
    }

    if (!update.view.hasFocus || !update.state.selection.main.empty) {
      this.reset();
      return;
    }

    if (!update.docChanged && !update.selectionSet) return;

    if (!update.docChanged && update.selectionSet) {
      this.reset();
      return;
    }

    const cursor = update.state.selection.main.head;

    let changeCount = 0;
    let insertedLen = 0;
    let deletedLen = 0;
    update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      changeCount++;
      if (changeCount === 1) {
        insertedLen = inserted.length;
        deletedLen = toA - fromA;
      }
    });

    const isSimple =
      changeCount === 1 && insertedLen <= 1 && deletedLen <= 1 && !(insertedLen === 0 && deletedLen === 0);

    const region = getActiveRegion(update.view);
    if (!region?.tree) {
      this.reset();
      return;
    }

    const mode = region.activeMode ?? region.mode;
    const kindLeft = region.activeKindLeft;

    if (kindLeft === SyntaxKind.Space || kindLeft === SyntaxKind.Hash) {
      this.reset();
      return;
    }

    if (mode === SyntaxMode.Math) {
      if (kindLeft === SyntaxKind.MathText || kindLeft === SyntaxKind.Math || kindLeft === SyntaxKind.MathShorthand) {
        this.reset();
        return;
      }
    }

    if (isSimple) {
      this.to = cursor;
      this.triggerAutocomplete(update.view, cursor, region);
    } else if (this.isActive || this.hasState) this.reset();
  }

  destroy() {
    this.reset();
    window.removeEventListener('keydown', this.onKeyDownCapture, true);
    this.container.remove();
  }

  // コアロジック

  public async triggerAutocomplete(view: EditorView, cursor: number, region: ParsedRegion) {
    const requestId = ++this.lastRequestId;

    this.allCandidates = [];
    this.candidates = [];
    this.selectedIndex = -1;
    this.hasState = false;
    this.isCycling = false;

    const regionInnerStart = region.from + region.skip;
    const currentCode = view.state.sliceDoc(regionInnerStart, region.to);
    let formatted = currentCode;
    let offset = 0;

    if (region.processor) {
      const res = format(currentCode, region.kind!, region.processor);
      formatted = res.formatted;
      offset = res.offset;
    }

    const innerOffset = cursor - regionInnerStart - offset;

    let wasmCompletions: Completion[] = [];
    let wasmFrom = cursor;

    try {
      const raw = await typstManager.wasm.autocompleteAsync(innerOffset, formatted);
      if (requestId !== this.lastRequestId) return; // 破棄
      if (raw?.completions && 0 < raw.completions.length) {
        wasmCompletions = raw.completions;
        wasmFrom = regionInnerStart + offset + raw.from;
      }
    } catch {
      if (requestId !== this.lastRequestId) return;
    }

    let localCompletions: Completion[] = [];
    let localFrom = cursor;

    const mode = region.activeMode ?? region.mode;

    // math mode の場合, latex 形式の検索も行う
    if (mode === SyntaxMode.Math) {
      const line = view.state.doc.lineAt(cursor);
      const textBefore = view.state.sliceDoc(line.from, cursor);
      const match = textBefore.match(symbolRegexForLatex);

      if (match?.groups?.symbol) {
        const query = match.groups.symbol;
        localFrom = cursor - query.length;
        const symbols = searchSymbols(query);

        localCompletions = symbols.map((symbolData: SymbolData) => {
          return {
            kind: 'symbol' as CompletionKind,
            symbol: symbolData.sym,
            label: `\\${symbolData.latexName}`,
            detail: symbolData.name,
            apply: symbolData.name,
          };
        });
      }
    }

    if (requestId !== this.lastRequestId) return; // 再チェック

    const autocompleteSettings = view.state.facet(autocompleteSettingsFacet);
    const useUnicodeSymbols = autocompleteSettings?.useUnicodeSymbols ?? false;

    const processCompletion = (item: Completion): Completion => {
      const result = { ...item };
      let symData: SymbolData | undefined;

      if (item.kind === 'symbol' || item.kind === 'constant') {
        const label = item.label.startsWith('sym.') ? item.label.slice(4) : item.label;
        const lookup = SYMBOLS_BY_NAME as Record<string, SymbolData>;
        symData = lookup[label] || lookup[item.detail || ''];
      }

      if (!useUnicodeSymbols || (item.kind !== 'symbol' && item.kind !== 'constant')) {
        if (item.apply) {
          if (symData && !['op', 'Large'].includes(symData.mathClass)) result.apply = `${item.apply} `;
        }
      } else {
        let symbol = item.symbol;
        if (!symbol && symData?.sym) symbol = symData.sym;

        if (symbol) {
          result.symbol = symbol;
          result.apply = symbol;
        }
      }

      if (item.kind === 'symbol' && symData && typeof symData.mathClass === 'string') {
        result.detail = symData.mathClass;
      }

      return result;
    };

    if (localCompletions.length > 0) {
      this.allCandidates = [...localCompletions, ...wasmCompletions].map(processCompletion);
      this.from = Math.min(localFrom, wasmFrom);
    } else {
      this.allCandidates = wasmCompletions.map(processCompletion);
      this.from = wasmFrom;
    }

    // 絞り込み
    this.allCandidates = this.allCandidates.filter((c) => !(c.kind === 'constant' && c.label === 'WIDTH'));
    // 並び替え
    this.allCandidates.sort((a, b) => {
      const score = (x: Completion) => (x.kind === 'param' || x.kind === 'font' || x.kind === 'path' ? 1 : 0);
      return score(b) - score(a);
    });

    for (const c of this.allCandidates) c.labelLow = c.label.toLowerCase();

    if (this.allCandidates.length === 0 || view.state.selection.main.head !== cursor) {
      this.reset();
      return;
    }

    this.to = cursor;
    this.filterAndRender(view, cursor);
  }

  private filterAndRender(view: EditorView, cursor: number) {
    if (this.isCycling) {
      this.hasState = true;
      if (!this.isActive) this.showUI();
      this.scheduleRender(view, cursor);
      return;
    }

    this.selectedIndex = -1;
    const rawQuery = view.state.sliceDoc(this.from, cursor);
    const query = rawQuery.toLowerCase();

    let filtered: Completion[];
    if (query.length === 0) {
      filtered = this.allCandidates;
    } else {
      const prefix = this.allCandidates.filter((c) => c.labelLow!.startsWith(query));
      filtered = prefix.length > 0 ? prefix : this.allCandidates.filter((c) => c.labelLow!.includes(query));

      filtered.sort((a, b) => {
        // Case-sensitive startsWith
        const aStartsRaw = a.label.startsWith(rawQuery);
        const bStartsRaw = b.label.startsWith(rawQuery);
        if (aStartsRaw !== bStartsRaw) return aStartsRaw ? -1 : 1;

        // Case-sensitive includes
        const aIncludesRaw = a.label.includes(rawQuery);
        const bIncludesRaw = b.label.includes(rawQuery);
        if (aIncludesRaw !== bIncludesRaw) return aIncludesRaw ? -1 : 1;

        return 0;
      });
    }

    if (filtered.length === 0) {
      this.hideUI();
      this.hasState = false;
      return;
    }

    if (filtered.length === 1 && filtered[0]!.label.toLowerCase() === query) {
      this.candidates = filtered;
      this.hasState = true;
      if (!this.isCycling && !this.isActive) this.hideUI();
      return;
    }

    this.candidates = filtered;
    this.hasState = true;
    if (!this.isActive) this.showUI();
    this.scheduleRender(view, cursor);
  }

  private scheduleRender(view: EditorView, cursor: number) {
    requestAnimationFrame(() => {
      if (view.state.selection.main.head !== cursor) return;

      this.renderItems();
      this.view.requestMeasure({
        read: () => {
          try {
            return calculatePopOverPositionByCursor({
              view,
              cursor: this.from,
              popOverMaxWidth: this.container.offsetWidth,
              popOverMaxHeight: this.container.offsetHeight,
            });
          } catch {
            return null;
          }
        },
        write: (position) => {
          if (position) this.applyPosition(position);
          else this.hideUI();
        },
      });
    });
  }

  // 描画

  private renderItems() {
    this.items.replaceChildren();

    if (this.selectedIndex === -1) {
      this.selectedIndex = this.lastPositionAbove ? this.candidates.length - 1 : 0;
    }

    for (const [index, item] of this.candidates.entries()) {
      const el = document.createElement('div');
      el.className = 'item';
      el.dataset.index = String(index);

      // アイコン
      const kindEl = document.createElement('span');
      kindEl.className = 'item-kind';
      kindEl.dataset.kind = item.kind;

      const color = item.kind === 'constant' ? extractColor(item.detail ?? undefined) : null;
      if (color) {
        const swatch = document.createElement('span');
        swatch.className = 'item-color-swatch';
        swatch.style.backgroundColor = color;
        kindEl.appendChild(swatch);
        kindEl.classList.add('has-color-swatch');
      } else {
        setIcon(kindEl, kindToIcon[item.kind as CompletionKind] ?? 'info');
      }
      el.appendChild(kindEl);

      // Symbol 補完
      if (item.symbol) {
        const symEl = document.createElement('span');
        symEl.className = 'item-symbol';
        symEl.textContent = item.symbol;
        el.appendChild(symEl);
      }

      // ラベル
      const labelEl = document.createElement('span');
      labelEl.className = 'item-label';
      labelEl.textContent = item.label;
      el.appendChild(labelEl);

      // 詳細
      if (item.detail) {
        const detailEl = document.createElement('span');
        detailEl.className = 'item-detail';
        detailEl.textContent = item.detail;
        el.appendChild(detailEl);
      }

      if (index === this.selectedIndex) el.classList.add('selected');
      this.items.appendChild(el);
    }
  }

  private applyPosition(position: { x: number; y: number; above: boolean }) {
    this.lastPositionAbove = position.above;
    const parentRect = this.view.dom.getBoundingClientRect();
    const x = position.x - parentRect.left;
    const y = position.y - parentRect.top;

    this.container.style.setProperty('--preview-left', `${x}px`);
    this.container.style.setProperty('--preview-top', `${y + 4}px`);
    this.container.classList.toggle('above', position.above);

    if (this.selectedIndex === -1) {
      this.selectedIndex = position.above ? this.candidates.length - 1 : 0;
      (this.items.children[this.selectedIndex] as HTMLElement | undefined)?.classList.add('selected');
    }

    if (this.candidates.length > 0) this.scrollSelectedIntoView();
  }

  private updateSelection(newIndex: number) {
    const children = this.items.children;
    if (this.selectedIndex >= 0) children[this.selectedIndex]?.classList.remove('selected');
    if (newIndex >= 0 && children[newIndex]) {
      children[newIndex].classList.add('selected');
      this.selectedIndex = newIndex;
    }
  }

  private scrollSelectedIntoView() {
    (this.items.children[this.selectedIndex] as HTMLElement | undefined)?.scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    });
  }

  // UI

  private showUI() {
    if (this.isActive) return;
    this.isActive = true;
    document.body.classList.add('typstmate-autocomplete-suggesting');
    window.addEventListener('mousemove', this.onMouseMoveCapture, true);
    window.addEventListener('mousedown', this.onMouseDownCapture, true);
  }

  private hideUI() {
    if (!this.isActive) return;
    this.isActive = false;
    document.body.classList.remove('typstmate-autocomplete-suggesting');
    window.removeEventListener('mousemove', this.onMouseMoveCapture, true);
    window.removeEventListener('mousedown', this.onMouseDownCapture, true);
  }

  hide() {
    this.reset();
  }

  private reset() {
    this.hideUI();
    this.allCandidates = [];
    this.candidates = [];
    this.selectedIndex = -1;
    this.hasState = false;
    this.isCycling = false;
  }

  // 補完

  private complete(item: Completion, isCycling = false) {
    const apply = item.apply ?? item.label;
    const { text } = resolveApply(apply);

    const currentQuery = this.view.state.sliceDoc(this.from, this.to);
    if (!isCycling && currentQuery === text) {
      this.execute(item);
      return;
    }

    this.isApplyingCompletion = true;
    this.view.dispatch({ changes: { from: this.from, to: this.to, insert: text } });
    this.isApplyingCompletion = false;

    this.to = this.from + text.length;
    this.filterAndRender(this.view, this.to);
  }

  private execute(item: Completion) {
    const context = resolveActionContext(this.view);
    const completeAction = tmActionsManager.actions.find(
      (a) =>
        a.trigger.t === 'complete' &&
        (a.trigger.v === item.label || a.trigger.v === item.apply) &&
        checkActionContext(this.view, a, context, this.to - this.from),
    );

    if (completeAction) {
      this.isApplyingCompletion = true;
      this.view.dispatch({
        changes: { from: this.from, to: this.to, insert: '' },
        userEvent: 'input.complete',
      });
      executeAction(this.view, context, completeAction);
      this.isApplyingCompletion = false;
      this.reset();
      this.view.focus();
      return;
    }

    const apply = item.apply ?? item.label;
    const { text, anchorOffset, headOffset } = resolveApply(apply);
    const newCursor = this.from + anchorOffset;
    const newHead = this.from + headOffset;

    this.isApplyingCompletion = true;
    this.view.dispatch({
      changes: { from: this.from, to: this.to, insert: text },
      selection: { anchor: newCursor, head: newHead },
      userEvent: 'input.complete',
    });
    this.isApplyingCompletion = false;

    this.reset();
    this.view.focus();

    if (item.kind === 'param') {
      const region = getActiveRegion(this.view);
      if (region) this.triggerAutocomplete(this.view, newCursor, region);
    }
  }

  // マウスイベント
  private readonly onMouseMoveCapture = (e: MouseEvent) => {
    if (!this.isActive) return;

    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (!item) return;

    const index = Number(item.dataset.index);
    if (!Number.isNaN(index)) this.updateSelection(index);
  };

  private readonly onMouseDownCapture = (e: MouseEvent) => {
    if (!this.isActive) return;

    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (!item) return;

    e.preventDefault();
    e.stopPropagation();
    const index = Number(item.dataset.index);
    if (!Number.isNaN(index) && this.candidates[index]) {
      this.execute(this.candidates[index]!);
      this.view.focus();
    }
  };

  // キーイベント

  private readonly onKeyDownCapture = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    if (['ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
      if (this.handleKeyAction(e.key, e)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  };

  handleKeyAction(key: string, e?: KeyboardEvent): boolean {
    if (!this.isActive || this.candidates.length === 0) return false;

    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        const len = this.candidates.length;
        const next =
          key === 'ArrowUp'
            ? this.selectedIndex <= 0
              ? len - 1
              : this.selectedIndex - 1
            : this.selectedIndex === -1 || this.selectedIndex === len - 1
              ? 0
              : this.selectedIndex + 1;
        this.updateSelection(next);
        this.scrollSelectedIntoView();
        return true;
      }
      case 'Tab': {
        const len = this.candidates.length;
        if (len === 1) {
          const target = this.candidates[0];
          if (target) this.execute(target);
          return true;
        }

        let nextIndex = this.selectedIndex < 0 ? 0 : this.selectedIndex;

        if (e?.shiftKey) {
          nextIndex = (nextIndex - 1 + len) % len;
        } else {
          const currentText = this.view.state.sliceDoc(this.from, this.to);
          const currentApply = this.candidates[nextIndex]?.apply ?? this.candidates[nextIndex]?.label;
          const targetText = currentApply ? resolveApply(currentApply).text : '';
          if (currentText === targetText) nextIndex = (nextIndex + 1) % len;
        }

        this.updateSelection(nextIndex);
        this.scrollSelectedIntoView();
        const target = this.candidates[this.selectedIndex];
        if (target) {
          this.isCycling = true;
          this.complete(target, true);
        }
        return true;
      }
      case 'Enter': {
        const target = this.candidates[this.selectedIndex] ?? this.candidates[0];
        if (target) this.execute(target);
        return true;
      }
      case 'Escape': {
        this.reset();
        this.view.focus();
        return true;
      }
    }

    return false;
  }
}

export const autocompletePlugin = ViewPlugin.fromClass(AutocompletePlugin);

export const autocompleteExtension = [
  autocompletePlugin,
  Prec.highest(
    keymap.of(
      ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].map((key) => ({
        key,
        run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction(key) ?? false,
      })),
    ),
  ),
];

export function startAutocomplete(view: EditorView): boolean {
  const selection = view.state.selection;
  if (selection.ranges.length !== 1) return false;

  const plugin = view.plugin(autocompletePlugin);
  if (!plugin) return false;

  const region = getActiveRegion(view);
  if (!region) return false;

  const cursor = selection.main.anchor;
  plugin.triggerAutocomplete(view, cursor, region);

  return true;
}
