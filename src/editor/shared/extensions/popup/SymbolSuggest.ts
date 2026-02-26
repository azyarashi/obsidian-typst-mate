import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { calculatePopupPosition } from '../../utils/position';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';
import { type SymbolData, searchSymbols } from './symbolSearcher';

import './SymbolSuggest.css';

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
  prevEl?: HTMLElement;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-symbols', 'typstmate-temporary');
    this.container.hide();
    this.items = document.createElement('div');
    this.items.className = 'items';
    this.container.appendChild(this.items);
    document.body.appendChild(this.container);
  }

  update(update: ViewUpdate) {
    if (!update.view.hasFocus || !update.state.selection.main.empty) {
      this.hide();
      return;
    }

    if (!update.docChanged) {
      if (update.selectionSet) this.hide();
      return;
    }

    const helper = update.state.facet(editorHelperFacet);
    if (!helper) return;

    const region = getActiveRegion(update.view);
    if (!region) {
      this.hide();
      return;
    }
    if (region.processor.disableSuggest) {
      this.hide();
      return;
    }

    const cursor = update.state.selection.main.head;
    const line = update.state.doc.lineAt(cursor);
    const textBefore = update.state.sliceDoc(line.from, cursor);
    const match = textBefore.match(symbolRegex);

    if (!match || !match.groups?.symbol) {
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

    const latex = query.at(0) === '\\';

    view.requestMeasure({
      read: () => {
        try {
          return calculatePopupPosition(view, this.queryFrom!, this.queryTo!);
        } catch {
          return null;
        }
      },
      write: (position) => {
        if (position) this.render(position, latex);
        else this.hide();
      },
    });
  }

  private render(position: { x: number; y: number }, latex: boolean) {
    this.container.style.setProperty('--preview-left', `${position.x}px`);
    this.container.style.setProperty('--preview-top', `${position.y}px`);

    if (this.container.style.display === 'none') this.renderFirst();

    this.items.replaceChildren();
    this.selectedIndex = -1;

    this.candidates.forEach((symbol, index) => {
      const item = document.createElement('div');
      item.className = 'item typstmate-symbol';
      item.dataset.index = index.toString();

      item.classList.add(symbol.kind!);
      if (latex) {
        item.classList.add('latex');
        item.textContent = `${symbol.sym}: \\${symbol.latexName} (${symbol.mathClass})`;
      } else {
        item.classList.add('typst');
        item.textContent = `${symbol.sym}: ${symbol.name} (${symbol.mathClass})`;
      }

      if (this.query === symbol.name) this.updateSelection(index);
      this.items.appendChild(item);
    });
  }

  private renderFirst() {
    this.prevEl = document.activeElement as HTMLElement;
    this.container.show();
    document.body.classList.add('typstmate-symbol-suggesting');
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mousedown', this.mouseDownListener);
  }

  hide() {
    this.container.hide();
    document.body.classList.remove('typstmate-symbol-suggesting');
    document.removeEventListener('mousemove', this.mouseMoveListener);
    document.removeEventListener('mousedown', this.mouseDownListener);
  }

  onMouseMove(e: MouseEvent) {
    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (!item) return;
    this.updateSelection(Number(item.dataset.index!));
  }

  onMouseDown(e: MouseEvent) {
    const item = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
    if (!item) return;
    this.execute(this.candidates[Number(item.dataset.index)] ?? this.candidates[0]!);
    this.hide();
    e.preventDefault();
  }

  onKeyDown(e: KeyboardEvent): boolean {
    if (this.container.style.display === 'none' || this.candidates.length === 0) return false;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        const candidatesLength = this.candidates.length;
        if (e.key === 'ArrowUp') {
          if (this.selectedIndex === -1) this.updateSelection(candidatesLength - 1);
          else this.updateSelection((this.selectedIndex - 1 + candidatesLength) % candidatesLength);
        } else {
          if (this.selectedIndex === -1) this.updateSelection(0);
          else this.updateSelection((this.selectedIndex + 1) % candidatesLength);
        }
        this.scrollSelectedIntoView();
        return true;
      }

      case 'Tab': {
        e.preventDefault();
        if (this.selectedIndex >= 0) this.complete(this.candidates[this.selectedIndex]! ?? this.candidates[0]!);
        else this.complete(this.candidates[0]!);
        return true;
      }

      case 'Enter': {
        this.prevEl?.focus();
        e.preventDefault();
        if (this.selectedIndex >= 0) this.execute(this.candidates[this.selectedIndex]! ?? this.candidates[0]!);
        else this.execute(this.candidates[0]!);
        this.hide();
        return true;
      }
    }

    return false;
  }

  private complete(symbol: SymbolData) {
    if (symbol.name === this.query) return this.execute(symbol);

    const helper = this.view.state.facet(editorHelperFacet);
    if (!helper || this.queryFrom === undefined || this.queryTo === undefined) return;

    this.view.dispatch({
      changes: { from: this.queryFrom, to: this.queryTo, insert: symbol.name },
    });
  }

  private execute(symbol: SymbolData) {
    const helper = this.view.state.facet(editorHelperFacet);
    if (!helper || this.queryFrom === undefined || this.queryTo === undefined) return;

    const region = getActiveRegion(this.view);
    if (!region) return;

    let content: string;
    if (region.processor.renderingEngine === 'mathjax') content = `\\${symbol.latexName}`;
    else if (helper.plugin.settings.complementSymbolWithUnicode) content = symbol.sym;
    else content = symbol.name;

    if (!['op', 'Large'].includes(symbol.mathClass)) content = `${content} `;

    this.view.dispatch({
      changes: { from: this.queryFrom, to: this.queryTo, insert: content },
    });
  }

  private updateSelection(newIndex: number) {
    if (newIndex === this.selectedIndex) {
      this.items.children[newIndex]?.classList.add('selected');
      return;
    }
    this.items.children[this.selectedIndex]?.classList.remove('selected');
    this.items.children[newIndex]?.classList.add('selected');
    this.selectedIndex = newIndex;
  }

  private scrollSelectedIntoView() {
    const el = this.items.children[this.selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  destroy() {
    this.hide();
    this.container.remove();
  }
}

export { SymbolSuggestPlugin };

export const symbolSuggestExtension = ViewPlugin.fromClass(SymbolSuggestPlugin);
