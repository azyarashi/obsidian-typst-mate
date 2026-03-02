import { Prec, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
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
      } else decorations = Decoration.none;
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

  isActive: boolean = false;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-snippets', 'typstmate-temporary');
    this.container.style.display = 'none';

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

    const region = getActiveRegion(update.view);
    if (!region) {
      this.hide();
      return;
    }
    const helper = update.state.facet(editorHelperFacet);

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

    if (!this.isActive) this.show();

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

      this.items.appendChild(item);
    });

    if (this.candidates.length > 0) {
      this.updateSelection(0);
    }
  }

  private show() {
    this.isActive = true;
    this.container.style.display = 'block';
    document.body.classList.add('typstmate-snippet-suggesting');
    document.addEventListener('mousemove', this.mouseMoveListener, true);
    document.addEventListener('mousedown', this.mouseDownListener, true);
  }

  hide() {
    if (!this.isActive) return;
    this.isActive = false;
    this.container.style.display = 'none';
    document.body.classList.remove('typstmate-snippet-suggesting');
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
        if (target) {
          // スクリプト型かつ引数未入力の場合は補完して待機
          if (target.script && this.argument === undefined) {
            this.complete(target);
            return true;
          } else {
            this.execute(target);
          }
        }
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

  handleTyping(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape', 'Shift'].includes(e.key)) return false;

    const cursor = this.view.state.selection.main.head;

    if (e.key === '(') {
      e.preventDefault();
      this.view.dispatch({
        changes: { from: cursor - (this.argument ? 2 : 1), insert: '()' },
      });
      return true;
    }

    if (e.key === 'Backspace') {
      if (!this.query) return false;
      e.preventDefault();
      let fromPos: number, toPos: number;

      if (this.argument) {
        if (this.argument === '()') {
          fromPos = cursor - 3; // '(' の前
          toPos = cursor - 1; // '@' の前
        } else {
          fromPos = cursor - 3; // 引数内の最後の文字の前
          toPos = cursor - 2; // 引数内の最後の文字の後
        }
      } else {
        fromPos = cursor - 2; // queryの最後の文字の前
        toPos = cursor - 1; // '@' の前
      }

      if (fromPos >= 0) {
        this.view.dispatch({ changes: { from: fromPos, to: toPos } });
      }
      return true;
    }

    if (e.key.length === 1) {
      if (e.key === ' ' && !this.argument) {
        this.hide();
        return false;
      }
      e.preventDefault();
      this.view.dispatch({
        changes: { from: cursor - (this.argument ? 2 : 1), insert: e.key },
      });
      return true;
    }

    return false;
  }

  private complete(snippet: Snippet) {
    if (!(snippet.script && !this.argument) && snippet.name === this.query) {
      return this.execute(snippet);
    }

    if (this.queryFrom === undefined || this.queryTo === undefined) return;

    const suffix = snippet.script ? (this.argument ? this.argument : '()') : '';
    const insertText = `${snippet.name}${suffix}@`;

    this.view.dispatch({
      changes: {
        from: this.queryFrom,
        to: this.queryTo,
        insert: insertText,
      },
    });
  }

  private execute(snippet: Snippet) {
    if (this.queryFrom === undefined || this.queryTo === undefined) return;

    let content = snippet.content;

    if (snippet.script) {
      try {
        const argValue = this.argument ? this.argument.slice(1, -1) : undefined;
        content = new Function('input', 'window', content)(argValue, window);
      } catch (e) {
        new Notice(`Snippet execution failed: ${String(e)}`);
        return;
      }
    }

    const cursorIndex = content.indexOf('#CURSOR');
    content = content.replace('#CURSOR', '');
    if (cursorIndex === -1) {
      content = `${content} `;
    }

    const newCursorPos = this.queryFrom + (cursorIndex === -1 ? content.length : cursorIndex);

    this.view.dispatch({
      changes: { from: this.queryFrom, to: this.queryTo, insert: content },
      selection: { anchor: newCursorPos },
      userEvent: 'input.complete',
    });
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

export const snippetSuggestPlugin = ViewPlugin.fromClass(SnippetSuggestPlugin);

export const snippetSuggestExtension = [
  atHighlightField,
  snippetSuggestPlugin,
  Prec.highest(
    keymap.of([
      { key: 'ArrowUp', run: (view) => view.plugin(snippetSuggestPlugin)?.handleKeyAction('ArrowUp') ?? false },
      { key: 'ArrowDown', run: (view) => view.plugin(snippetSuggestPlugin)?.handleKeyAction('ArrowDown') ?? false },
      { key: 'Enter', run: (view) => view.plugin(snippetSuggestPlugin)?.handleKeyAction('Enter') ?? false },
      { key: 'Tab', run: (view) => view.plugin(snippetSuggestPlugin)?.handleKeyAction('Tab') ?? false },
      { key: 'Escape', run: (view) => view.plugin(snippetSuggestPlugin)?.handleKeyAction('Escape') ?? false },
    ]),
  ),
  EditorView.domEventHandlers({
    keydown(e, view) {
      const plugin = view.plugin(snippetSuggestPlugin);
      if (plugin?.isActive) return plugin.handleTyping(e);
      return false;
    },
  }),
];
