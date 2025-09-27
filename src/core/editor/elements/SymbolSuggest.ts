import type { EditorPosition } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import { type SymbolData, searchSymbols } from '@/utils/symbolSearcher';
import type { PopupPosition } from '../editor';

import './symbol-suggest.css';

export const symbolRegex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<symbol>\\?([a-zA-Z.][a-zA-Z.]+|[-<>|=[\]~:-][-<>|=[\]~:-]+))$/;

export default class SymbolSuggestElement extends HTMLElement {
  plugin!: ObsidianTypstMate;
  items!: HTMLElement;

  candidates: SymbolData[] = [];
  selectedIndex: number = -1;

  query?: string;
  queryPos?: EditorPosition;

  prevEl?: HTMLElement;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  startup(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    this.addClasses(['typstmate-symbols', 'typstmate-temporary']);
    this.hide();
    this.items = this.createEl('div', { cls: 'items' });
  }

  suggest(query: string, cursorPos: EditorPosition) {
    this.candidates = searchSymbols(query);
    if (!this.candidates.length) return this.close();
    this.query = query;
    this.queryPos = {
      line: cursorPos.line,
      ch: cursorPos.ch - query.length,
    };

    const position = this.plugin.editorHelper.calculatePopupPosition(this.queryPos, cursorPos);

    this.render(position, query.at(0) === '\\');
  }

  private render(position: PopupPosition, latex: boolean) {
    this.prevEl = document.activeElement as HTMLElement;
    this.style.setProperty('--preview-left', `${position.x}px`);
    this.style.setProperty('--preview-top', `${position.y}px`);

    if (this.style.display === 'none') this.renderFirst();
    this.items.empty();

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
    this.selectedIndex = -1;
    this.show();
    this.setAttribute('tabindex', '0');
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mousedown', this.mouseDownListener);
  }

  close() {
    this.hide();
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
      case 'Tab':
      case 'ArrowRight': {
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

    this.plugin.editorHelper.replaceWithLength(symbol.name, this.queryPos!, this.query!.length);
  }

  private execute(symbol: SymbolData) {
    let content: string;
    if (this.plugin.settings.complementSymbolWithUnicode) content = symbol.sym;
    else content = symbol.name;

    if (!['op', 'Large'].includes(symbol.mathClass)) content = `${content} `;

    this.plugin.editorHelper.replaceWithLength(content, this.queryPos!, this.query!.length);
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
