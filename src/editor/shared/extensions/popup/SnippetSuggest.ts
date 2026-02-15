import { type EditorPosition, Notice } from 'obsidian';

import type { PopupPosition } from '@/editor';
import type { Snippet } from '@/libs/snippet';
import type ObsidianTypstMate from '@/main';

import './SnippetSuggest.css';

export const snippetRegex =
  /(?:^| |\$|\(|\)|\[|\]|\{|\}|<|>|\+|-|\/|\*|=|!|\?|#|%|&|'|:|;|,|\d)(?<query>[^\W_]+)(?<arg>\(.*\))?@$/;

// TODO! Abstract Class にする

export default class SnippetSuggestElement extends HTMLElement {
  plugin!: ObsidianTypstMate;
  items!: HTMLElement;

  candidates: Snippet[] = [];
  selectedIndex: number = -1;

  query?: string;
  argument?: string; // () 含む
  queryPos?: EditorPosition;

  prevEl?: HTMLElement;

  private mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
  private mouseDownListener = (e: MouseEvent) => this.onMouseDown(e);

  startup(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    this.addClasses(['typstmate-snippets', 'typstmate-temporary']);
    this.hide();
    this.items = this.createEl('div', { cls: 'items' });
  }

  suggest(query: string, cursorPos: EditorPosition, argument?: string) {
    this.candidates = this.plugin.settings.snippets?.filter((s) => s.name.includes(query)) ?? [];
    if (!this.candidates.length) return this.close();
    this.query = query;
    this.queryPos = {
      line: cursorPos.line,
      ch: cursorPos.ch - query.length - (argument?.length ?? 0) - 1,
    };
    this.argument = argument;

    const position = this.plugin.editorHelper.calculatePopupPosition(this.queryPos, cursorPos);

    // @ のハイライト
    this.plugin.editorHelper.addHighlightsWithLength(
      1,
      [
        {
          line: cursorPos.line,
          ch: cursorPos.ch - 1,
        },
      ],
      'typstmate-atmode',
      true,
    );

    this.render(position);
  }

  private render(position: PopupPosition) {
    this.style.setProperty('--preview-left', `${position.x}px`);
    this.style.setProperty('--preview-top', `${position.y}px`);

    if (this.style.display === 'none') this.renderFirst();
    this.items.empty();

    this.candidates.forEach((snippet, index) => {
      const item = this.items.createEl('div', { cls: 'item' });
      item.dataset.index = index.toString();

      this.selectedIndex = -1;
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
        const contentEl = item.createEl('div');
        this.plugin.typstManager.render(content, contentEl, snippet.kind);
        item.appendChild(document.createTextNode(`${snippet.name} (${snippet.category})`));
        item.appendChild(contentEl);
      }

      if (this.query === snippet.name) this.updateSelection(index);
    });
  }

  private renderFirst() {
    this.prevEl = document.activeElement as HTMLElement;
    this.show();
    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mousedown', this.mouseDownListener);
  }

  close() {
    this.plugin.editorHelper.editor?.removeHighlights('typstmate-atmode');
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
        return;
      }

      case 'Tab': {
        e.preventDefault();
        this.prevEl?.focus();
        if (this.selectedIndex >= 0) this.complete(this.candidates[this.selectedIndex]! ?? this.candidates[0]!);
        else this.complete(this.candidates[0]!);
        return;
      }
      case 'Enter': {
        e.preventDefault();
        this.prevEl?.focus();
        let snippet: Snippet;
        if (this.selectedIndex >= 0) snippet = this.candidates[this.selectedIndex]! ?? this.candidates[0]!;
        else snippet = this.candidates[0]!;

        if (snippet.script && this.argument === undefined) this.complete(snippet);
        else this.execute(snippet);
        return;
      }

      case 'Shift': {
        e.preventDefault();
        return;
      }

      default: {
        if (e.key === '(' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const cursor = this.plugin.editorHelper.editor!.getCursor();
          this.plugin.editorHelper.editor!.replaceRange('()', {
            line: cursor.line,
            ch: cursor.ch - (this.argument ? 2 : 1),
          });
          return;
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.key === ' ' && this.argument === undefined) {
            this.prevEl?.focus();
            this.blur();
            this.close();
            return;
          }
          e.preventDefault();
          const cursor = this.plugin.editorHelper.editor!.getCursor();
          this.plugin.editorHelper.editor!.replaceRange(e.key, {
            line: cursor.line,
            ch: cursor.ch - (this.argument ? 2 : 1),
          });
          return;
        } else if (e.key === 'Backspace') {
          // @ のみのとき
          if (this.query === undefined) break;

          // @ 直前を消す
          e.preventDefault();
          const cursor = this.plugin.editorHelper.editor!.getCursor();
          this.plugin.editorHelper.replaceWithLength(
            '',
            {
              line: cursor.line,
              ch: cursor.ch - (this.argument ? 3 : 2),
            },
            this.argument === '()' ? 2 : 1,
          );
          return;
        } else if (e.key === 'Shift') {
          e.preventDefault();
          return;
        }
      }
    }

    this.prevEl?.focus();
    this.blur();
    this.close();
  }

  private complete(snippet: Snippet) {
    if (!(snippet.script && !this.argument) && snippet.name === this.query) return this.execute(snippet);

    this.plugin.editorHelper.replaceWithLength(
      `${snippet.name + (snippet.script ? (this.argument ? this.argument : '()') : '')}@`,
      this.queryPos!,
      this.query!.length + (this.argument?.length ?? 0) + 1,
    );
  }

  private execute(snippet: Snippet) {
    let content = snippet.content;
    // スクリプトの実行
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

    this.plugin.editorHelper.replaceWithLength(
      content,
      this.queryPos!,
      this.query!.length + (this.argument?.length ?? 0) + 1,
    );
    const newCursorPos = {
      line: this.queryPos!.line,
      ch: this.queryPos!.ch + (cursorIndex === -1 ? content.length : cursorIndex),
    };
    this.plugin.editorHelper.editor?.setCursor(newCursorPos);

    const offset = this.plugin.editorHelper.editor!.posToOffset(newCursorPos);
    this.plugin.editorHelper.updateMathObject(offset);
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
}
