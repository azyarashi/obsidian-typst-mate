import type { EditorView } from '@codemirror/view';

import type ObsidianTypstMate from '@/main';
import { SyntaxMode } from '@/utils/rust/crates/typst-synatx';
import { type SymbolData, searchSymbols } from '@/utils/symbolSearcher';
import type { PopupPosition } from '../utils/position';

import './symbol-suggest.css';

export const symbolRegex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<symbol>\\?([a-zA-Z.][a-zA-Z.]+|[-<>|=[\]~:-][-<>|=[\]~:-]+))$/;

export default class SymbolSuggestElement extends HTMLElement {
  plugin!: ObsidianTypstMate;
  items!: HTMLElement;

  candidates: SymbolData[] = [];
  selectedIndex: number = -1;

  query?: string;
  queryPos?: number;
  currentView?: EditorView;

  prevEl?: HTMLElement;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  startup(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    this.addClasses(['typstmate-symbols', 'typstmate-temporary']);
    this.hide();
    this.items = this.createEl('div', { cls: 'items' });
  }

  mode?: SyntaxMode;

  suggest(view: EditorView, query: string, cursorOffset: number, mode: SyntaxMode) {
    this.currentView = view;
    this.mode = mode;
    if (this.query && query.startsWith(this.query) && this.candidates.length > 0) {
      if (query.startsWith('\\')) {
        const q = query.replace(/\\/g, '');
        this.candidates = this.candidates.filter((c) => c.latexName.replace(/\\/g, '').includes(q));
      } else {
        this.candidates = this.candidates.filter((c) => c.name.includes(query));
      }
    } else {
      this.candidates = searchSymbols(query);
    }

    if (!this.candidates.length) return this.close();
    this.query = query;
    this.queryPos = cursorOffset - query.length;

    const position = this.plugin.editorHelper.calculatePopupPosition(view, this.queryPos, cursorOffset);

    this.render(position, query.at(0) === '\\');
  }

  private render(position: PopupPosition, latex: boolean) {
    this.prevEl = document.activeElement as HTMLElement;
    this.style.setProperty('--preview-left', `${position.x}px`);
    this.style.setProperty('--preview-top', `${position.y}px`);

    if (this.style.display === 'none') this.renderFirst();
    this.items.empty();

    this.selectedIndex = -1;
    this.candidates.forEach((symbol, index) => {
      const item = this.items.createEl('div', { cls: 'item typstmate-symbol' });
      item.dataset.index = index.toString();

      item.addClass(symbol.kind!);
      if (latex) {
        item.addClass('latex');
        item.textContent = `${symbol.sym}: ${symbol.latexName} (${symbol.mathClass})`;
      } else {
        item.addClass('typst');
        item.textContent = `${symbol.sym}: ${symbol.name} (${symbol.mathClass})`;
      }

      if (this.query === symbol.name) this.updateSelection(index);
    });
  }

  private renderFirst() {
    this.prevEl = document.activeElement as HTMLElement;
    this.show();
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mousedown', this.mouseDownListener);
  }

  close() {
    this.hide();
    this.candidates = [];
    this.query = undefined;
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
    this.close();
    e.preventDefault();
  }

  onKeyDown(e: KeyboardEvent) {
    if (this.candidates.length === 0) return;

    switch (e.key) {
      // select
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
        return;
      }

      // complete
      case 'Tab': {
        e.preventDefault();
        if (this.selectedIndex >= 0) this.complete(this.candidates[this.selectedIndex]! ?? this.candidates[0]!);
        else this.complete(this.candidates[0]!);
        return;
      }

      // execute
      case 'Enter': {
        this.prevEl?.focus();
        e.preventDefault();
        if (this.selectedIndex >= 0) this.execute(this.candidates[this.selectedIndex]! ?? this.candidates[0]!);
        else this.execute(this.candidates[0]!);
        this.close();
        return;
      }
    }
  }

  private complete(symbol: SymbolData) {
    if (symbol.name === this.query) return this.execute(symbol);

    if (!this.currentView) return;
    this.plugin.editorHelper.replaceWithLength(this.currentView, symbol.name, this.queryPos!, this.query!.length);
  }

  private execute(symbol: SymbolData) {
    let content: string;

    if (this.plugin.typstManager.beforeProcessor?.renderingEngine === 'mathjax') {
      content = symbol.latexName;
    } else {
      switch (this.mode) {
        case SyntaxMode.Markup:
          if (this.plugin.settings.complementSymbolWithUnicode) content = symbol.sym;
          else content = `#sym.${symbol.name}`;
          break;
        case SyntaxMode.Code:
          if (this.plugin.settings.complementSymbolWithUnicode) content = symbol.sym;
          else content = `sym.${symbol.name}`;
          break;
        default:
          if (this.plugin.settings.complementSymbolWithUnicode) content = symbol.sym;
          else content = symbol.name;
          break;
      }
    }

    if (!['op', 'Large'].includes(symbol.mathClass)) content = `${content} `;

    if (!this.currentView) return;
    this.plugin.editorHelper.replaceWithLength(this.currentView, content, this.queryPos!, this.query!.length);
  }

  private updateSelection(newIndex: number) {
    if (newIndex === this.selectedIndex) return this.items.children[newIndex]?.classList.add('selected');
    this.items.children[this.selectedIndex]?.classList.remove('selected');
    this.items.children[newIndex]?.classList.add('selected');
    this.selectedIndex = newIndex;
  }

  private scrollSelectedIntoView() {
    const el = this.items.children[this.selectedIndex];
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
}
