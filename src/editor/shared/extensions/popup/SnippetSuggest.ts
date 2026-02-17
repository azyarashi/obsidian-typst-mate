import { StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { Notice } from 'obsidian';
import type { Snippet } from '@/libs/snippet';
import { calculatePopupPosition } from '../../utils/position';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

import './SnippetSuggest.css';

export const snippetRegex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<query>[^\W_]+)(?<arg>\(.*\))?@$/;

const atHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);

    if (tr.docChanged || tr.selection) {
      const cursor = tr.state.selection.main.head;
      const line = tr.state.doc.lineAt(cursor);
      const textBefore = tr.state.sliceDoc(line.from, cursor);
      const match = textBefore.match(snippetRegex);

      if (match?.groups?.query) {
        const atPos = cursor - 1;
        const deco = Decoration.mark({ class: 'typstmate-atmode' }).range(atPos, cursor);
        decorations = Decoration.set([deco]);
      } else {
        decorations = Decoration.none;
      }
    }

    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class SnippetSuggestPlugin implements PluginValue {
  container: HTMLElement;
  items: HTMLElement;
  candidates: Snippet[] = [];
  selectedIndex: number = -1;
  query?: string;
  argument?: string;
  queryFrom?: number;
  queryTo?: number;
  prevEl?: HTMLElement;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-snippets', 'typstmate-temporary');
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

    if (!update.docChanged && !update.selectionSet) return;

    const helper = update.state.facet(editorHelperFacet);
    if (!helper) return;

    const region = getActiveRegion(update.view);
    if (!region) {
      this.hide();
      return;
    }

    const cursor = update.state.selection.main.head;
    const line = update.state.doc.lineAt(cursor);
    const textBefore = update.state.sliceDoc(line.from, cursor);
    const match = textBefore.match(snippetRegex);

    if (!match || !match.groups?.query) {
      this.hide();
      return;
    }

    const query = match.groups.query;
    const argument = match.groups.arg;

    this.suggest(query, cursor, argument, update.view, helper);
  }

  suggest(query: string, cursor: number, argument: string | undefined, view: EditorView, helper: any) {
    this.candidates = helper.plugin.settings.snippets?.filter((s: Snippet) => s.name.includes(query)) ?? [];
    if (!this.candidates.length) {
      this.hide();
      return;
    }

    this.query = query;
    this.argument = argument;
    const queryLength = query.length + (argument?.length ?? 0) + 1;
    this.queryFrom = cursor - queryLength;
    this.queryTo = cursor;

    view.requestMeasure({
      read: () => {
        try {
          return calculatePopupPosition(view, this.queryFrom!, this.queryTo!);
        } catch {
          return null;
        }
      },
      write: (position) => {
        if (position) {
          this.render(position, helper);
        } else {
          this.hide();
        }
      },
    });
  }

  private render(position: { x: number; y: number }, helper: any) {
    this.container.style.setProperty('--preview-left', `${position.x}px`);
    this.container.style.setProperty('--preview-top', `${position.y}px`);

    if (this.container.style.display === 'none') this.renderFirst();

    this.items.replaceChildren();
    this.selectedIndex = -1;

    this.candidates.forEach((snippet, index) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.dataset.index = index.toString();

      let content: string = snippet.content;
      if (snippet.script) {
        item.append(`📦${snippet.name} (${snippet.category})`);
      } else {
        switch (snippet.kind) {
          case 'inline':
            content = `${snippet.id}${snippet.id === '' ? '' : ':'}${content}`;
            break;
          case 'display':
            content = `${snippet.id}\n${content}\n`;
            break;
          case 'codeblock':
            content = `${snippet.id}\n${content}\n`;
            break;
        }
        const contentEl = document.createElement('div');
        helper.plugin.typstManager.render(content, contentEl, snippet.kind);
        item.appendChild(document.createTextNode(`${snippet.name} (${snippet.category})`));
        item.appendChild(contentEl);
      }

      if (this.query === snippet.name) this.updateSelection(index);
      this.items.appendChild(item);
    });
  }

  private renderFirst() {
    this.prevEl = document.activeElement as HTMLElement;
    this.container.show();
    document.body.classList.add('typstmate-snippet-suggesting');
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mousedown', this.mouseDownListener);
  }

  hide() {
    this.container.hide();
    document.body.classList.remove('typstmate-snippet-suggesting');
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
      case 'ArrowDown':
      case 'ArrowUp': {
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
        this.prevEl?.focus();
        if (this.selectedIndex >= 0) this.complete(this.candidates[this.selectedIndex]! ?? this.candidates[0]!);
        else this.complete(this.candidates[0]!);
        return true;
      }

      case 'Enter': {
        e.preventDefault();
        this.prevEl?.focus();
        let snippet: Snippet;
        if (this.selectedIndex >= 0) snippet = this.candidates[this.selectedIndex]! ?? this.candidates[0]!;
        else snippet = this.candidates[0]!;

        if (snippet.script && this.argument === undefined) this.complete(snippet);
        else this.execute(snippet);
        return true;
      }

      case 'Shift': {
        e.preventDefault();
        return true;
      }

      default: {
        if (e.key === '(' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const cursor = this.view.state.selection.main.head;
          this.view.dispatch({
            changes: {
              from: cursor - (this.argument ? 2 : 1),
              insert: '()',
            },
          });
          return true;
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key === ' ' && this.argument === undefined) {
            this.prevEl?.focus();
            this.hide();
            return false;
          }
          e.preventDefault();
          const cursor = this.view.state.selection.main.head;
          this.view.dispatch({
            changes: {
              from: cursor - (this.argument ? 2 : 1),
              insert: e.key,
            },
          });
          return true;
        } else if (e.key === 'Backspace') {
          if (this.query === undefined) break;

          e.preventDefault();
          const cursor = this.view.state.selection.main.head;
          this.view.dispatch({
            changes: {
              from: cursor - (this.argument ? 3 : 2),
              to: cursor - (this.argument && this.argument === '()' ? 1 : 0),
            },
          });
          return true;
        } else if (e.key === 'Shift') {
          e.preventDefault();
          return true;
        }
      }
    }

    this.prevEl?.focus();
    this.hide();
    return false;
  }

  private complete(snippet: Snippet) {
    if (!(snippet.script && !this.argument) && snippet.name === this.query) return this.execute(snippet);

    if (this.queryFrom === undefined || this.queryTo === undefined) return;

    this.view.dispatch({
      changes: {
        from: this.queryFrom,
        to: this.queryTo,
        insert: `${snippet.name + (snippet.script ? (this.argument ? this.argument : '()') : '')}@`,
      },
    });
  }

  private execute(snippet: Snippet) {
    let content = snippet.content;

    if (snippet.script) {
      try {
        content = new Function('input', 'window', content)(this.argument?.slice(1, -1), window);
      } catch (e) {
        new Notice(String(e));
        return;
      }
    }

    const cursorIndex = content.indexOf('#CURSOR');
    content = content.replace('#CURSOR', '');
    if (cursorIndex === -1) content = `${content} `;

    if (this.queryFrom === undefined || this.queryTo === undefined) return;

    const newCursorPos = this.queryFrom + (cursorIndex === -1 ? content.length : cursorIndex);

    this.view.dispatch({
      changes: { from: this.queryFrom, to: this.queryTo, insert: content },
      selection: { anchor: newCursorPos },
    });
  }

  private updateSelection(newIndex: number) {
    if (newIndex === this.selectedIndex) return;
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

export { SnippetSuggestPlugin };

const snippetSuggestPlugin = ViewPlugin.fromClass(SnippetSuggestPlugin);

export const snippetSuggestExtension = [atHighlightField, snippetSuggestPlugin];
