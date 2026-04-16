import { SyntaxMode } from '@typstmate/typst-syntax';
import { Prec } from '@codemirror/state';
import { type EditorView, keymap, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { setIcon } from 'obsidian';
import type { Completion, CompletionKind } from '@/../pkg/typst_wasm';
import SYMBOLS_BY_NAME from '@/data/symbols.json';
import { typstManager } from '@/libs';
import { format } from '@/ui/elements/Typst';
import { getActiveRegion, type ParsedRegion } from '../../utils/core';
import { calculatePopupPosition } from '../../utils/position';
import { type SymbolData, searchSymbols } from '../../utils/symbolSearcher';
import { autocompleteSettingsFacet } from './package';

import './Autocomplete.css';

const symbolRegexForLatex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<symbol>\\[a-zA-Z.]*)$/;
const placeholderRegex = /\$\{(?:\d+:)?([^}]*)}/g;
const rgbDetailRegex = /^rgb\("#?([0-9a-fA-F]{3,8})"\)$/;

const kindToIcon: Record<CompletionKind, string> = {
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
  let cursorPos = -1;
  let result = '';
  let lastIdx = 0;

  for (let match = placeholderRegex.exec(apply); match !== null; match = placeholderRegex.exec(apply)) {
    result += apply.slice(lastIdx, match.index);
    if (cursorPos === -1) cursorPos = result.length;
    result += match[1];
    lastIdx = match.index + match[0].length;
  }
  result += apply.slice(lastIdx);
  if (cursorPos === -1) cursorPos = result.length;
  return { text: result, cursor: cursorPos };
}

/** Returns a CSS hex color if the detail is an rgb() constant description. */
function extractColor(detail?: string): string | null {
  if (!detail) return null;
  const m = detail.match(rgbDetailRegex);
  return m ? `#${m[1]}` : null;
}

// ─────────────────────────────────────────────────────────────────────────────

class AutocompletePlugin implements PluginValue {
  private container: HTMLElement;
  private items: HTMLElement;

  // Completion state
  allCandidates: Completion[] = [];
  candidates: Completion[] = [];
  selectedIndex = -1;

  /** Start of the current completion range (position before the query text). */
  from = 0;
  /** End of the current completion range (current cursor / last applied cursor). */
  to = 0;

  /** Popup is visible. */
  isActive = false;
  /**
   * Candidates are saved but the popup is hidden.
   * Set after Tab (complete) or Enter (execute) so the next keystroke can
   * resume filtering without a fresh WASM call.
   */
  private hasState = false;

  /** True while we are mid-dispatch to ignore re-entrant update() calls. */
  private isApplyingCompletion = false;
  private isCycling = false;

  private readonly onMouseMoveCapture = (e: MouseEvent) => this.handleMouseMove(e);
  private readonly onMouseDownCapture = (e: MouseEvent) => this.handleMouseDown(e);
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

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-autocomplete');

    this.items = this.container.createDiv('items');

    document.body.appendChild(this.container);

    window.addEventListener('keydown', this.onKeyDownCapture, true);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  update(update: ViewUpdate) {
    if (this.isApplyingCompletion) return;

    if (!update.view.hasFocus || !update.state.selection.main.empty) {
      this.reset();
      return;
    }

    if (!update.docChanged && !update.selectionSet) return;

    // Cursor moved without a doc change → abort
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

    // A "simple" change is exactly one character inserted or deleted.
    const isSimple =
      changeCount === 1 && insertedLen <= 1 && deletedLen <= 1 && !(insertedLen === 0 && deletedLen === 0);

    // ── Abort if typing digits in math mode ──────────────────────────────
    if (update.docChanged && isSimple && insertedLen === 1) {
      let text = '';
      update.changes.iterChanges((_fA, _tA, _fB, _tB, inserted) => (text = inserted.toString()));
      if (/[0-9]/.test(text)) {
        const region = getActiveRegion(update.view);
        if ((region?.activeMode ?? region?.mode) === SyntaxMode.Math) {
          this.reset();
          return;
        }
      }
    }

    // ── Active popup: narrow on each keystroke ───────────────────────────
    if (this.isActive) {
      if (!isSimple || cursor < this.from) {
        this.reset();
        return;
      }
      this.to = cursor;
      this.filterAndRender(update.view, cursor);
      return;
    }

    // ── Hidden but saved state (after Tab or Enter): resume filtering ────
    if (this.hasState) {
      if (cursor < this.from || !isSimple) {
        this.reset();
        if (!isSimple) return; // non-simple → don't trigger fresh autocomplete
        // Simple change below `from`: fall through for fresh autocomplete
      } else {
        this.isCycling = false; // Reset cycling on manual typing
        this.to = cursor;
        this.filterAndRender(update.view, cursor);
        return;
      }
    }

    // ── Fresh autocomplete ────────────────────────────────────────────────
    if (!isSimple) return;

    const region = getActiveRegion(update.view);
    if (!region?.tree) return;

    this.triggerAutocomplete(update.view, cursor, region);
  }

  destroy() {
    this.reset();
    window.removeEventListener('keydown', this.onKeyDownCapture, true);
    this.container.remove();
  }

  // ── Core autocomplete ─────────────────────────────────────────────────────

  private async triggerAutocomplete(view: EditorView, cursor: number, region: ParsedRegion) {
    this.allCandidates = [];
    this.candidates = [];
    this.selectedIndex = -1;
    this.hasState = false;

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

    let wasmCompletions: Completion[] = [];
    let wasmFrom = cursor;

    try {
      const raw = await typstManager.wasm.autocompleteAsync(innerOffset, formatted);
      if (raw?.completions && raw.completions.length > 0) {
        wasmCompletions = raw.completions;
        wasmFrom = regionInnerStart + offset + raw.from;
      }
    } catch {
      // ignore WASM errors
    }

    let localCompletions: Completion[] = [];
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
          return {
            kind: 'symbol' as CompletionKind,
            symbol: sym.sym,
            label: `\\${sym.latexName}`,
            detail: sym.name,
            apply: sym.name,
          };
        });
      }
    }

    const autocompleteSettings = view.state.facet(autocompleteSettingsFacet);
    const useUnicodeSymbols = autocompleteSettings?.useUnicodeSymbols ?? false;

    const processCompletion = (item: Completion): Completion => {
      if (!useUnicodeSymbols || (item.kind !== 'symbol' && item.kind !== 'constant')) {
        if (item.label.startsWith('\\') && item.apply) {
          const symData = (SYMBOLS_BY_NAME as any)[item.detail || ''];
          if (symData && !['op', 'Large'].includes(symData.mathClass)) return { ...item, apply: `${item.apply} ` };
        }
        return item;
      }

      let symbol = item.symbol;
      if (!symbol) {
        const label = item.label.startsWith('sym.') ? item.label.slice(4) : item.label;
        const symData = (SYMBOLS_BY_NAME as any)[label] || (SYMBOLS_BY_NAME as any)[item.detail || ''];
        if (symData?.sym) symbol = symData.sym;
      }

      if (symbol) {
        return {
          ...item,
          symbol,
          apply: symbol,
        };
      }
      return item;
    };

    if (localCompletions.length > 0) {
      this.allCandidates = [...localCompletions, ...wasmCompletions].map(processCompletion);
      this.from = Math.min(localFrom, wasmFrom);
    } else {
      this.allCandidates = wasmCompletions.map(processCompletion);
      this.from = wasmFrom;
    }

    this.allCandidates = this.allCandidates.filter((c) => !(c.kind === 'constant' && c.label === 'WIDTH'));

    this.allCandidates.sort((a, b) => {
      const score = (x: Completion) => (x.kind === 'func' || x.kind === 'constant' ? 1 : 0);
      return score(b) - score(a);
    });

    if (this.allCandidates.length === 0 || view.state.selection.main.head !== cursor) {
      this.reset();
      return;
    }

    this.to = cursor;
    this.candidates = this.allCandidates;
    this.hasState = true;

    if (!this.isActive) this.showUI();
    this.scheduleRender(view, cursor);
  }

  private filterAndRender(view: EditorView, cursor: number) {
    if (this.isCycling) {
      // While cycling with Tab, we don't want to filter based on the newly inserted text
      this.hasState = true;
      if (!this.isActive) this.showUI();
      this.scheduleRender(view, cursor);
      return;
    }

    this.selectedIndex = -1;
    const query = view.state.sliceDoc(this.from, cursor).toLowerCase();

    let filtered: Completion[];
    if (query.length === 0) {
      filtered = this.allCandidates;
    } else {
      const prefix = this.allCandidates.filter((c) => c.label.toLowerCase().startsWith(query));
      filtered = prefix.length > 0 ? prefix : this.allCandidates.filter((c) => c.label.toLowerCase().includes(query));
    }

    if (filtered.length === 0) {
      this.hideUI();
      this.hasState = false;
      return;
    }

    // Single exact match → keep state for next char but hide popup
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
    setTimeout(() => {
      if (view.state.selection.main.head !== cursor) return;
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
          else this.hideUI();
        },
      });
    }, 0);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private render(position: { x: number; y: number; isTop: boolean }) {
    this.container.style.setProperty('--preview-left', `${position.x}px`);
    this.container.style.setProperty('--preview-top', `${position.y}px`);
    this.container.classList.toggle('is-top', position.isTop);

    this.items.replaceChildren();

    if (this.selectedIndex === -1) {
      this.selectedIndex = position.isTop ? this.candidates.length - 1 : 0;
    }

    for (const [index, item] of this.candidates.entries()) {
      const el = document.createElement('div');
      el.className = 'item';
      el.dataset.index = String(index);

      // Kind icon — or a color swatch if the constant has an rgb() detail
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

      // Unicode symbol (math completions)
      if (item.symbol) {
        const symEl = document.createElement('span');
        symEl.className = 'item-symbol';
        symEl.textContent = item.symbol;
        el.appendChild(symEl);
      }

      // Label
      const labelEl = document.createElement('span');
      labelEl.className = 'item-label';
      labelEl.textContent = item.label;
      el.appendChild(labelEl);

      // Detail (suppressed for color swatches — the swatch speaks for itself)
      if (item.detail) {
        const detailEl = document.createElement('span');
        detailEl.className = 'item-detail';
        detailEl.textContent = item.detail;
        el.appendChild(detailEl);
      }

      if (index === this.selectedIndex) el.classList.add('selected');
      this.items.appendChild(el);
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

  // ── UI visibility ─────────────────────────────────────────────────────────

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

  // ── Mouse handlers ────────────────────────────────────────────────────────

  private handleMouseMove(e: MouseEvent) {
    if (!this.isActive) return;
    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (!item) return;
    const index = Number(item.dataset.index);
    if (!Number.isNaN(index)) this.updateSelection(index);
  }

  private handleMouseDown(e: MouseEvent) {
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
  }

  // ── Completion actions ────────────────────────────────────────────────────

  /**
   * Tab – insert the candidate's text and continue narrowing.
   * If the query already matches the candidate exactly, finalizes (execute).
   */
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
    // Re-filter immediately so the popup reflects the completed text
    this.filterAndRender(this.view, this.to);
  }

  /**
   * Enter – finalize the selection and fully reset.
   * A fresh autocomplete will trigger naturally on the next keystroke.
   */
  private execute(item: Completion) {
    const apply = item.apply ?? item.label;
    const { text, cursor } = resolveApply(apply);

    this.isApplyingCompletion = true;
    this.view.dispatch({
      changes: { from: this.from, to: this.to, insert: text },
      selection: { anchor: this.from + cursor },
      userEvent: 'input.complete',
    });
    this.isApplyingCompletion = false;

    this.reset();
    this.view.focus();
  }

  // ── Keyboard handler ──────────────────────────────────────────────────────

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
    keymap.of([
      { key: 'ArrowUp', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('ArrowUp') ?? false },
      { key: 'ArrowDown', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('ArrowDown') ?? false },
      { key: 'Enter', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('Enter') ?? false },
      { key: 'Tab', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('Tab') ?? false },
      { key: 'Escape', run: (view) => view.plugin(autocompletePlugin)?.handleKeyAction('Escape') ?? false },
    ]),
  ),
];
