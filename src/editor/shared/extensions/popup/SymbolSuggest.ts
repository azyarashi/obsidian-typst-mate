import { type EditorView, keymap, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { SyntaxMode } from '@/utils/crates/typst-syntax';
import { calculatePopupPosition } from '../../utils/position';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';
import { type SymbolData, searchSymbols } from './symbolSearcher';

import './SymbolSuggest.css';
import { Prec } from '@codemirror/state';

export const symbolRegex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<symbol>\\?([a-zA-Z.][a-zA-Z.]+|[-<>|=[\]~:-][-<>|=[\]~:-]+))$/;

class SymbolSuggestPlugin implements PluginValue {
  container: HTMLElement;
  items: HTMLElement;
  candidates: SymbolData[] = [];
  selectedIndex: number = -1;
  query?: string;
  queryFrom?: number;
  queryTo?: number;

  // 状態管理フラグ
  isActive: boolean = false;
  private isApplyingCompletion: boolean = false;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-symbols', 'typstmate-temporary');
    this.container.style.display = 'none';

    this.items = document.createElement('div');
    this.items.className = 'items';
    this.container.appendChild(this.items);

    document.body.appendChild(this.container);
  }

  update(update: ViewUpdate) {
    if (this.isApplyingCompletion) return;

    if (!update.view.hasFocus || !update.state.selection.main.empty) {
      this.hide();
      return;
    }

    if (!update.docChanged) {
      if (update.selectionSet) this.hide();
      return;
    }

    const region = getActiveRegion(update.view);
    if (!region || region.processor?.disableSuggest || region.syntaxMode !== SyntaxMode.Math) {
      this.hide();
      return;
    }

    const cursor = update.state.selection.main.head;
    const line = update.state.doc.lineAt(cursor);
    const textBefore = update.state.sliceDoc(line.from, cursor);
    const match = textBefore.match(symbolRegex);

    if (!match || !match.groups?.symbol) {
      console.log(4);
      this.hide();
      return;
    }

    const query = match.groups.symbol;
    this.suggest(query, cursor, update.view);
  }

  suggest(query: string, cursor: number, view: EditorView) {
    this.candidates = searchSymbols(query);
    if (!this.candidates.length) {
      this.hide();
      return;
    }

    this.query = query;
    this.queryFrom = cursor - query.length;
    this.queryTo = cursor;

    const isLatex = query.startsWith('\\');

    view.requestMeasure({
      read: () => {
        try {
          return calculatePopupPosition(view, this.queryFrom!, this.queryTo!);
        } catch {
          return null;
        }
      },
      write: (position) => {
        if (position) this.render(position, isLatex);
        else this.hide();
      },
    });
  }

  private render(position: { x: number; y: number }, isLatex: boolean) {
    this.container.style.setProperty('--preview-left', `${position.x}px`);
    this.container.style.setProperty('--preview-top', `${position.y}px`);

    if (!this.isActive) this.show();

    this.items.replaceChildren();
    this.selectedIndex = -1;

    this.candidates.forEach((symbol, index) => {
      const item = document.createElement('div');
      item.className = 'item typstmate-symbol';
      item.dataset.index = index.toString();
      if (symbol.kind) item.classList.add(symbol.kind);

      if (isLatex) {
        item.classList.add('latex');
        item.textContent = `${symbol.sym}: \\${symbol.latexName} (${symbol.mathClass})`;
      } else {
        item.classList.add('typst');
        item.textContent = `${symbol.sym}: ${symbol.name} (${symbol.mathClass})`;
      }

      this.items.appendChild(item);
    });

    if (this.candidates.length > 0) this.updateSelection(0);
  }

  private show() {
    this.isActive = true;
    this.container.style.display = 'block';
    document.body.classList.add('typstmate-symbol-suggesting');

    document.addEventListener('mousemove', this.mouseMoveListener, true);
    document.addEventListener('mousedown', this.mouseDownListener, true);
  }

  hide() {
    if (!this.isActive) return;
    this.isActive = false;
    this.container.style.display = 'none';
    document.body.classList.remove('typstmate-symbol-suggesting');
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
      }
    }
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
        this.hide();
        this.view.focus();
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

  private complete(symbol: SymbolData) {
    if (symbol.name === this.query) return this.execute(symbol);
    if (this.queryFrom === undefined || this.queryTo === undefined) return;

    this.isApplyingCompletion = true;
    this.view.dispatch({
      changes: { from: this.queryFrom, to: this.queryTo, insert: symbol.name },
    });
    this.isApplyingCompletion = false;

    this.query = symbol.name;
    this.queryTo = this.queryFrom + symbol.name.length;
    this.suggest(this.query, this.queryTo, this.view);
  }

  private execute(symbol: SymbolData) {
    if (this.queryFrom === undefined || this.queryTo === undefined) return;

    const helper = this.view.state.facet(editorHelperFacet);
    const region = getActiveRegion(this.view);
    if (!region) return;

    let content = symbol.name;
    if (region.processor?.renderingEngine === 'mathjax') {
      content = `\\${symbol.latexName}`;
    } else if (helper.plugin.settings.complementSymbolWithUnicode) {
      content = symbol.sym || symbol.name;
    }

    if (!['op', 'Large'].includes(symbol.mathClass)) {
      content += ' '; // スペースを挿入
    }

    this.isApplyingCompletion = true;
    this.view.dispatch({
      changes: { from: this.queryFrom, to: this.queryTo, insert: content },
      selection: { anchor: this.queryFrom + content.length },
      userEvent: 'input.complete',
    });
    this.isApplyingCompletion = false;
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
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  destroy() {
    this.hide();
    this.container.remove();
  }
}

export const symbolSuggestPlugin = ViewPlugin.fromClass(SymbolSuggestPlugin);

export const symbolSuggestExtension = [
  symbolSuggestPlugin,
  Prec.highest(
    keymap.of([
      { key: 'ArrowUp', run: (view) => view.plugin(symbolSuggestPlugin)?.handleKeyAction('ArrowUp') ?? false },
      { key: 'ArrowDown', run: (view) => view.plugin(symbolSuggestPlugin)?.handleKeyAction('ArrowDown') ?? false },
      { key: 'Enter', run: (view) => view.plugin(symbolSuggestPlugin)?.handleKeyAction('Enter') ?? false },
      { key: 'Tab', run: (view) => view.plugin(symbolSuggestPlugin)?.handleKeyAction('Tab') ?? false },
      { key: 'Escape', run: (view) => view.plugin(symbolSuggestPlugin)?.handleKeyAction('Escape') ?? false },
    ]),
  ),
];
