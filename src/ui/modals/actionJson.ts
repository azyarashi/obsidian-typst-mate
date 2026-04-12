import { codeFolding, foldCode, foldService, unfoldCode } from '@codemirror/language';
import { type Diagnostic, linter } from '@codemirror/lint';
import { type Range, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { type App, Modal } from 'obsidian';
import { obsidianTheme } from '@/editor/shared/extensions/Theme';
import type { Action } from '@/libs/action';
import { buildMiniEditorExtensions } from '@/libs/editorHelper/miniEditor';

import './actionJson.css';

const setSearchQuery = StateEffect.define<string>();
const searchField = StateField.define<string>({
  create() {
    return '';
  },
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setSearchQuery)) value = e.value;
    return value;
  },
});

const jsonFoldService = foldService.of((state, lineStart, _lineEnd) => {
  const line = state.doc.lineAt(lineStart);
  const text = line.text;
  const openBrace = text.lastIndexOf('{');
  const openBracket = text.lastIndexOf('[');
  const bracePos = Math.max(openBrace, openBracket);

  if (bracePos === -1) return null;

  const opener = text[bracePos];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  const docText = state.doc.toString();

  for (let i = line.from + bracePos; i < docText.length; i++) {
    const c = docText[i];
    if (c === opener) depth++;
    else if (c === closer) {
      depth--;
      if (depth === 0) return { from: line.from + bracePos + 1, to: i };
    }
  }
  return null;
});

const searchHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.transactions.some((tr) => tr.effects.some((e) => e.is(setSearchQuery)))) {
        this.decorations = this.buildDecorations(update.view);
      }
    }
    buildDecorations(view: EditorView) {
      const query = view.state.field(searchField);
      if (!query) return Decoration.none;
      const deco: Range<Decoration>[] = [];
      const q = query.toLowerCase();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to).toLowerCase();
        let pos = text.indexOf(q);
        while (pos > -1) {
          deco.push(Decoration.mark({ class: 'typstmate-search-match' }).range(from + pos, from + pos + query.length));
          pos = text.indexOf(q, pos + query.length);
        }
      }
      return Decoration.set(deco);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export class ActionJsonModal extends Modal {
  private editor!: EditorView;
  private onSave: (actions: Action[]) => void;
  private initialValue: string;

  constructor(app: App, actions: Action[], onSave: (actions: Action[]) => void) {
    super(app);
    this.initialValue = JSON.stringify(actions, null, 2);
    this.onSave = onSave;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.titleEl.setText('Edit Actions JSON');

    const searchContainer = contentEl.createDiv({ cls: 'typstmate-json-search-container' });
    searchContainer.style.marginBottom = 'var(--size-4-2)';
    searchContainer.style.display = 'flex';
    searchContainer.style.gap = 'var(--size-4-2)';
    searchContainer.style.alignItems = 'center';

    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      placeholder: 'Search text...',
      cls: 'typstmate-ext-search',
    });
    searchInput.style.flex = '1';

    const countSpan = searchContainer.createEl('span', {
      cls: 'typstmate-search-count',
    });
    countSpan.style.fontSize = 'var(--font-ui-smaller)';
    countSpan.style.color = 'var(--text-muted)';
    countSpan.style.minWidth = '4em';

    const findMatches = (query: string) => {
      const matches: { from: number; to: number }[] = [];
      if (!query) return matches;
      const text = this.editor.state.doc.toString().toLowerCase();
      const q = query.toLowerCase();
      let pos = text.indexOf(q);
      while (pos > -1) {
        matches.push({ from: pos, to: pos + query.length });
        pos = text.indexOf(q, pos + query.length);
      }
      return matches;
    };

    const updateCount = () => {
      const query = searchInput.value;
      const matches = findMatches(query);
      if (!query) {
        countSpan.setText('');
        return;
      }
      const cursor = this.editor.state.selection.main.from;
      let current = matches.findIndex((m) => m.from >= cursor) + 1;
      if (current === 0 && matches.length > 0) current = matches.length;
      countSpan.setText(`${matches.length > 0 ? current : 0} / ${matches.length}`);
    };

    const navigate = (direction: 'next' | 'prev') => {
      const query = searchInput.value;
      const matches = findMatches(query);
      if (matches.length === 0) return;

      const cursor = this.editor.state.selection.main.from;
      let index = matches.findIndex((m) => m.from > cursor);

      if (direction === 'next') {
        if (index === -1) index = 0;
      } else {
        if (index === -1) index = matches.length - 1;
        else index = (index - 2 + matches.length) % matches.length;
      }

      const match = matches[index];
      if (!match) return;

      this.editor.dispatch({
        selection: { anchor: match.from, head: match.to },
        scrollIntoView: true,
      });
      updateCount();
    };

    searchInput.oninput = () => {
      this.editor.dispatch({ effects: setSearchQuery.of(searchInput.value) });
      updateCount();
    };

    const prevBtn = searchContainer.createEl('button', { text: '↑', cls: 'typstmate-button' });
    prevBtn.style.padding = '0 var(--size-4-2)';
    prevBtn.onclick = () => navigate('prev');

    const nextBtn = searchContainer.createEl('button', { text: '↓', cls: 'typstmate-button' });
    nextBtn.style.padding = '0 var(--size-4-2)';
    nextBtn.onclick = () => navigate('next');

    // Fold/Unfold buttons
    const foldBtn = searchContainer.createEl('button', { text: 'Fold All', cls: 'typstmate-button' });
    foldBtn.onclick = () => {
      // Custom fold logic to skip top-level
      const doc = this.editor.state.doc;
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        if (line.text.startsWith('  {')) {
          this.editor.dispatch({ selection: { anchor: line.from + 3 } });
          foldCode(this.editor);
        }
      }
      this.editor.dispatch({ selection: { anchor: 0 } });
    };

    const unfoldBtn = searchContainer.createEl('button', { text: 'Unfold All', cls: 'typstmate-button' });
    unfoldBtn.onclick = () => {
      const doc = this.editor.state.doc;
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        this.editor.dispatch({ selection: { anchor: line.from } });
        unfoldCode(this.editor);
      }
      this.editor.dispatch({ selection: { anchor: 0 } });
    };

    // Add Action Buttons
    const addContainer = contentEl.createDiv({ cls: 'typstmate-json-add-container' });
    addContainer.style.display = 'flex';
    addContainer.style.gap = 'var(--size-4-2)';
    addContainer.style.marginBottom = 'var(--size-4-2)';
    addContainer.style.flexWrap = 'wrap';

    const triggerTypes = ['hotkey', 'type', 'regex', 'long-press'];
    triggerTypes.forEach((t) => {
      const btn = addContainer.createEl('button', {
        text: `+ ${t}`,
        cls: 'typstmate-button',
      });
      btn.style.fontSize = 'var(--font-ui-smaller)';
      btn.onclick = () => {
        const template = {
          id: `new-${t}-action`,
          contexts: ['Markdown', 'Vim'],
          trigger: { t: t, v: t === 'hotkey' ? 'mod-alt-h' : '' },
          action: { t: 'snippet', v: '' },
        };
        const json = JSON.stringify(template, null, 2);
        const text = this.editor.state.doc.toString();
        const insertPos = text.indexOf('[') + 1;

        this.editor.dispatch({
          changes: { from: insertPos, to: insertPos, insert: `\n  ${json.replace(/\n/g, '\n  ')},` },
          scrollIntoView: true,
          selection: { anchor: insertPos + 4 },
        });
      };
    });

    const editorContainer = contentEl.createDiv({ cls: 'typstmate-json-editor-container' });
    editorContainer.style.height = '60vh';
    editorContainer.style.border = '1px solid var(--background-modifier-border)';
    editorContainer.style.overflow = 'hidden';
    editorContainer.style.fontSize = 'var(--font-ui-small)';

    const jsonLinter = linter((view) => {
      const diagnostics: Diagnostic[] = [];
      try {
        JSON.parse(view.state.doc.toString());
      } catch (e: any) {
        let from = 0;
        let to = 0;
        const message = e.message;
        const match = message.match(/at position (\d+)/);
        if (match) {
          const pos = Number.parseInt(match[1], 10);
          from = Math.max(0, pos - 1);
          to = Math.min(view.state.doc.length, pos + 1);
        }
        diagnostics.push({
          from,
          to,
          severity: 'error',
          message: message,
        });
      }
      return diagnostics;
    });

    this.editor = new EditorView({
      doc: this.initialValue,
      extensions: [
        ...buildMiniEditorExtensions({ lineNumbers: true }),
        obsidianTheme,
        jsonLinter,
        searchField,
        searchHighlighter,
        jsonFoldService,
        codeFolding({
          preparePlaceholder: (state, range) => {
            const text = state.doc.sliceString(range.from, range.to);
            const match = text.match(/"id":\s*"([^"]+)"/);
            return match ? `{ "id": "${match[1]}", ... }` : '{ ... }';
          },
          placeholderDOM: (_view, onclick, prepared) => {
            const span = document.createElement('span');
            span.className = 'cm-foldPlaceholder';
            span.textContent = prepared;
            span.onclick = onclick;
            return span;
          },
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.typstmate-search-match': { backgroundColor: 'var(--text-accent)', color: 'var(--text-on-accent)' },
          '.cm-selectionMatch': { backgroundColor: 'var(--text-accent-hover)' },
        }),
      ],
      parent: editorContainer,
    });

    requestAnimationFrame(() => {
      const doc = this.editor.state.doc;
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        if (line.text.startsWith('  {')) {
          this.editor.dispatch({
            selection: { anchor: line.from + 3 },
          });
          foldCode(this.editor);
        }
      }
      this.editor.dispatch({ selection: { anchor: 0 } });
    });

    const buttonContainer = contentEl.createDiv({ cls: 'typstmate-modal-button-container' });
    buttonContainer.style.marginTop = 'var(--size-4-4)';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = 'var(--size-4-2)';

    const saveBtn = buttonContainer.createEl('button', {
      text: 'Save',
      cls: 'mod-cta',
    });
    saveBtn.onclick = async () => {
      try {
        const newValue = this.editor.state.doc.toString();
        const parsed = JSON.parse(newValue);
        if (!Array.isArray(parsed)) throw new Error('Must be an array of actions');

        await this.onSave(parsed);
        this.close();
      } catch (e: any) {
        alert(`Error parsing JSON:\n${e.message}`);
      }
    };

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();
  }

  override onClose() {
    if (this.editor) {
      this.editor.destroy();
    }
  }
}
