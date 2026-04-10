import { Prec } from '@codemirror/state';
import { type EditorView, keymap, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { SyntaxMode } from '@typstmate/typst-syntax';
import { setIcon } from 'obsidian';
import type { CompletionKindSer, CompletionSer } from '@/../pkg/typst_wasm';
import { settingsManager, typstManager } from '@/libs';
import { EditorContextFacet } from '@/libs/extensionManager';
import { format } from '@/ui/elements/Typst';

import { getActiveRegion, type ParsedRegion } from '../utils/core';
import { calculatePopupPosition } from '../utils/position';
import { type SymbolData, searchSymbols } from '../utils/symbolSearcher';

import './Autocomplete.css';

const symbolRegexForLatex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<symbol>\\[a-zA-Z.]*)$/;
const placeholderRegex = /\$\{(?:\d+:)?([^}]*)\}/g;

const kindToIcon: Record<CompletionKindSer, string> = {
  func: 'function-square',
  type: 'box',
  param: 'at-sign',
  constant: 'hash',
  path: 'folder',
  package: 'package',
  label: 'tag',
  font: 'type',
  symbol: 'asterisk',
  syntax: 'code',
};

function resolveApply(apply: string): { text: string; cursor: number } {
  // ${<n>:<label>}, ${<n>}
  let cursorPos = -1;
  let text = apply;

  // まず最初のプレースホルダの位置をカーソルとして採用する

  let result = '';
  let lastIdx = 0;

  for (let match = placeholderRegex.exec(apply); match !== null; match = placeholderRegex.exec(apply)) {
    result += apply.slice(lastIdx, match.index);
    if (cursorPos === -1) cursorPos = result.length;
    result += match[1];
    lastIdx = match.index + match[0].length;
  }

  result += apply.slice(lastIdx);
  text = result;

  if (cursorPos === -1) cursorPos = text.length;
  return { text, cursor: cursorPos };
}

class AutocompletePlugin implements PluginValue {
  container: HTMLElement;
  items: HTMLElement;

  cursor = -1;
  allCandidates: CompletionSer[] = []; // WASM から返された全候補（フィルタリング前）
  candidates: CompletionSer[] = [];
  selectedIndex = -1;

  /** 補完を適用する開始 offset (doc 内 UTF-16, WASM が返す from + regionInnerStart) */
  from = 0;
  /** カーソル位置（補完クエリの末尾） */
  to = 0;

  isActive = false;
  private isApplyingCompletion = false;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-autocomplete');

    this.items = document.createElement('div');
    this.items.className = 'items';
    this.container.appendChild(this.items);

    document.body.appendChild(this.container);
  }

  update(update: ViewUpdate) {
    // input.complete は isApplyingCompletion より先に確認する。
    // execute() が dispatch() を呼ぶと update() が同期的に呼ばれるので
    // isApplyingCompletion=true のままでも input.complete は検出可能にする。
    const isAfterComplete = update.transactions.some((tr) => tr.isUserEvent('input.complete'));

    if (this.isApplyingCompletion && !isAfterComplete) return;

    // フォーカスが外れたり複数選択のときは隠す
    if (!update.view.hasFocus || !update.state.selection.main.empty) {
      this.hide();
      return;
    }

    // doc 変更もカーソル移動もないなら無視
    if (!update.docChanged && !update.selectionSet) return;

    // カーソル移動のみ → 隠す
    if (!update.docChanged && update.selectionSet) {
      this.hide();
      return;
    }

    const cursor = update.state.selection.main.head;

    // ===== 変更の種類を解析 =====
    // "シンプル変更": 1箇所かつ (1文字挿入 or 1文字削除) のみを許容
    let changeCount = 0;
    let insertedLen = 0;
    let deletedLen = 0;

    update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      changeCount++;
      if (changeCount === 1) {
        insertedLen = inserted.length;
        deletedLen = toA - fromA; // 変更前の範囲サイズ = 削除されたバイト数
      }
    });

    const isSimple =
      changeCount === 1 && insertedLen <= 1 && deletedLen <= 1 && !(insertedLen === 0 && deletedLen === 0);

    // ===== ポップアップが開いている場合: クライアントサイドフィルタリング =====
    if (this.isActive && !isAfterComplete) {
      // 範囲削除・ペーストなど複雑な変更 → 閉じる
      if (!isSimple) {
        this.hide();
        return;
      }

      // カーソルが補完開始位置より前に移動した → 閉じる
      if (cursor < this.from) {
        this.hide();
        return;
      }

      // クエリでフィルタリングして再表示
      this.to = cursor;
      this.filterAndRender(update.view, cursor);
      return;
    }

    // ===== ポップアップが閉じている場合 / 補完直後: WASM autocomplete をトリガー =====
    // 補完後は無条件で試みる。それ以外は単純な1文字操作のみ許容。
    if (!isAfterComplete && !isSimple) return;

    const region = getActiveRegion(update.view);
    if (!region?.tree) return;

    this.triggerAutocomplete(update.view, cursor, region);
  }

  // ======================================================================
  // WASM 呼び出しによる補完取得
  // ======================================================================

  private async triggerAutocomplete(view: EditorView, cursor: number, region: ParsedRegion) {
    this.allCandidates = [];
    this.candidates = [];

    const regionInnerStart = region.from + region.skip;
    const currentCode = view.state.sliceDoc(regionInnerStart, region.to);
    let formatted = currentCode;
    let offset = 0;

    if (region.processor) {
      const res = format(currentCode, region.kind, region.processor);
      formatted = res.formatted;
      offset = res.offset;
    }

    const innerOffset = cursor - regionInnerStart - offset;

    let wasmCompletions: CompletionSer[] = [];
    let wasmFrom = cursor;

    try {
      const raw = await typstManager.wasm.autocompleteAsync(innerOffset, formatted);
      if (raw?.completions && raw.completions.length > 0) {
        wasmCompletions = raw.completions;
        wasmFrom = regionInnerStart + offset + raw.from;
      }
    } catch {
      // Ignore errors from WASM
    }

    let localCompletions: CompletionSer[] = [];
    let localFrom = cursor;

    const mode = region.activeMode ?? region.mode;

    if (mode === SyntaxMode.Math) {
      const line = view.state.doc.lineAt(cursor);
      const textBefore = view.state.sliceDoc(line.from, cursor);
      const match = textBefore.match(symbolRegexForLatex);

      if (match?.groups?.symbol) {
        const query = match.groups.symbol;
        localFrom = cursor - query.length;
        const symbols = searchSymbols(query);

        localCompletions = symbols.map((sym: SymbolData) => {
          const context = view.state.facet(EditorContextFacet);
          const mathConcealSettings = settingsManager.settings.extensionSettings[context]?.['math-symbol-conceal'];
          const complementWithUnicode =
            (mathConcealSettings?.values?.complementWithUnicode as boolean | undefined) ?? false;

          let applyText = complementWithUnicode ? sym.sym || sym.name : sym.name;
          if (!['op', 'Large'].includes(sym.mathClass)) {
            applyText += ' ';
          }
          return {
            kind: 'symbol' as CompletionKindSer,
            symbol: sym.sym,
            label: `\\${sym.latexName}`,
            detail: sym.name,
            apply: applyText,
          };
        });
      }
    }

    if (localCompletions.length > 0) {
      this.allCandidates = [...localCompletions, ...wasmCompletions];
      this.from = localFrom < wasmFrom ? localFrom : wasmFrom;
    } else {
      this.allCandidates = wasmCompletions;
      this.from = wasmFrom;
    }

    // "FuncとConstant優先で" (Priozitize Func and Constant)
    this.allCandidates.sort((a, b) => {
      const aPrio = a.kind === 'func' || a.kind === 'constant' ? 1 : 0;
      const bPrio = b.kind === 'func' || b.kind === 'constant' ? 1 : 0;
      return bPrio - aPrio;
    });

    if (this.allCandidates.length === 0) {
      this.hide();
      return;
    }

    // await 中にカーソルが動いていたら破棄 (stale check)
    if (view.state.selection.main.head !== cursor) {
      this.hide();
      return;
    }

    this.to = cursor;
    this.candidates = this.allCandidates;

    // requestMeasure を setTimeout(0) でラップして update-in-progress エラーを回避
    setTimeout(() => {
      if (view.state.selection.main.head !== cursor) {
        this.hide();
        return;
      }
      view.requestMeasure({
        read: () => {
          try {
            return calculatePopupPosition(view, this.from, this.to);
          } catch {
            return null;
          }
        },
        write: (position) => {
          if (position) this.render(position);
          else this.hide();
        },
      });
    }, 0);
  }

  // ======================================================================
  // クライアントサイドフィルタリング (ポップアップ表示中の絞り込み)
  // ======================================================================

  private filterAndRender(view: EditorView, cursor: number) {
    // from〜cursor がクエリ文字列
    const query = view.state.sliceDoc(this.from, cursor).toLowerCase();

    let filtered: CompletionSer[];
    if (query.length === 0) {
      filtered = this.allCandidates;
    } else {
      // 前方一致 → 部分一致の順で優先度付きフィルタリング
      const prefix = this.allCandidates.filter((c) => c.label.toLowerCase().startsWith(query));
      if (prefix.length > 0) {
        filtered = prefix;
      } else {
        filtered = this.allCandidates.filter((c) => c.label.toLowerCase().includes(query));
      }
    }

    if (filtered.length === 0) {
      this.hide();
      return;
    }

    // 候補が1件かつクエリと完全一致 → 既に正確な文字列を入力済みなので非表示
    if (filtered.length === 1 && filtered[0]?.label.toLowerCase() === query) {
      this.hide();
      return;
    }

    this.candidates = filtered;

    setTimeout(() => {
      if (view.state.selection.main.head !== cursor) {
        this.hide();
        return;
      }
      view.requestMeasure({
        read: () => {
          try {
            return calculatePopupPosition(view, this.from, cursor);
          } catch {
            return null;
          }
        },
        write: (position) => {
          if (position) this.render(position);
          else this.hide();
        },
      });
    }, 0);
  }

  private render(position: { x: number; y: number }) {
    this.container.style.setProperty('--preview-left', `${position.x}px`);
    this.container.style.setProperty('--preview-top', `${position.y}px`);

    if (!this.isActive) this.show();

    this.items.replaceChildren();
    this.selectedIndex = -1;

    this.candidates.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'item';
      el.dataset.index = index.toString();

      const kindEl = document.createElement('span');
      kindEl.className = 'item-kind';
      kindEl.dataset.kind = item.kind;
      el.appendChild(kindEl);

      setIcon(kindEl, kindToIcon[item.kind as CompletionKindSer] || 'info');

      // 2. Symbol (if available) -> ("アイコンの次に記号")
      if (item.symbol) {
        const symEl = document.createElement('span');
        symEl.className = 'item-symbol';
        symEl.textContent = item.symbol;
        el.appendChild(symEl);
      }

      // 3. Label
      const labelEl = document.createElement('span');
      labelEl.className = 'item-label';
      labelEl.textContent = item.label;
      el.appendChild(labelEl);

      // 4. Detail
      if (item.detail) {
        const detailEl = document.createElement('span');
        detailEl.className = 'item-detail';
        detailEl.textContent = item.detail;
        el.appendChild(detailEl);
      }

      this.items.appendChild(el);
    });

    if (this.candidates.length > 0) this.updateSelection(0);
  }

  private updateSelection(newIndex: number) {
    const children = this.items.children;
    if (this.selectedIndex >= 0 && children[this.selectedIndex]) {
      children[this.selectedIndex]!.classList.remove('selected');
    }
    if (newIndex >= 0 && children[newIndex]) {
      children[newIndex].classList.add('selected');
      this.selectedIndex = newIndex;
    }
  }

  private scrollSelectedIntoView() {
    const el = this.items.children[this.selectedIndex] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  private show() {
    this.isActive = true;
    document.body.classList.add('typstmate-autocomplete-suggesting');
    document.addEventListener('mousemove', this.mouseMoveListener, true);
    document.addEventListener('mousedown', this.mouseDownListener, true);
  }

  hide() {
    if (!this.isActive) return;
    this.isActive = false;
    this.allCandidates = [];
    this.candidates = [];
    document.body.classList.remove('typstmate-autocomplete-suggesting');
    document.removeEventListener('mousemove', this.mouseMoveListener, true);
    document.removeEventListener('mousedown', this.mouseDownListener, true);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isActive) return;
    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (!item) return;
    const index = Number(item.dataset.index);
    if (!Number.isNaN(index)) this.updateSelection(index);
  }

  onMouseDown(e: MouseEvent) {
    if (!this.isActive) return;
    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (item) {
      e.preventDefault();
      e.stopPropagation();
      const index = Number(item.dataset.index);
      if (!Number.isNaN(index) && this.candidates[index]) {
        this.execute(this.candidates[index]);
        this.hide();
        this.view.focus();
      }
    }
  }

  private complete(item: CompletionSer) {
    const apply = item.apply ?? item.label;
    const { text } = resolveApply(apply);

    const currentQuery = this.view.state.sliceDoc(this.from, this.to);
    if (currentQuery === text) return this.execute(item);

    this.isApplyingCompletion = true;
    this.view.dispatch({
      changes: { from: this.from, to: this.to, insert: text },
    });
    this.isApplyingCompletion = false;

    this.to = this.from + text.length;
  }

  private execute(item: CompletionSer) {
    const apply = item.apply ?? item.label;
    const { text, cursor } = resolveApply(apply);

    this.isApplyingCompletion = true;
    this.view.dispatch({
      changes: { from: this.from, to: this.to, insert: text },
      selection: { anchor: this.from + cursor },
      userEvent: 'input.complete',
    });
    this.isApplyingCompletion = false;

    this.hide();
    this.view.focus();
  }

  handleKeyAction(key: string): boolean {
    if (!this.isActive || this.candidates.length === 0) return false;

    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        const len = this.candidates.length;
        if (key === 'ArrowUp') {
          this.updateSelection(this.selectedIndex <= 0 ? len - 1 : this.selectedIndex - 1);
        } else {
          this.updateSelection(
            this.selectedIndex === -1 || this.selectedIndex === len - 1 ? 0 : this.selectedIndex + 1,
          );
        }
        this.scrollSelectedIntoView();
        return true;
      }
      case 'Tab': {
        const target = this.selectedIndex >= 0 ? this.candidates[this.selectedIndex] : this.candidates[0];
        if (target) this.complete(target);
        return true;
      }
      case 'Enter': {
        const target = this.selectedIndex >= 0 ? this.candidates[this.selectedIndex] : this.candidates[0];
        if (target) this.execute(target);
        return true;
      }
      case 'Escape': {
        this.hide();
        this.view.focus();
        return true;
      }
    }
    return false;
  }

  destroy() {
    this.hide();
    this.container.remove();
  }
}

export const autocompletePlugin = ViewPlugin.fromClass(AutocompletePlugin);

export const autocompleteExtension = [
  autocompletePlugin,
  Prec.highest(
    keymap.of([
      { key: 'ArrowUp', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('ArrowUp') ?? false },
      { key: 'ArrowDown', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('ArrowDown') ?? false },
      { key: 'Enter', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('Enter') ?? false },
      { key: 'Tab', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('Tab') ?? false },
      { key: 'Escape', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('Escape') ?? false },
    ]),
  ),
];
