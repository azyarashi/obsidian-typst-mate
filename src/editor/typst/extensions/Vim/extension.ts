import { Annotation, type Extension, Facet, Prec, StateEffect, StateField } from '@codemirror/state';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import {
  createInitialContext,
  processKeystroke,
  TextBuffer,
  type VimAction,
  type VimContext,
  type VimMode,
} from '@vimee/core';
import { cursorToOffset, offsetToCursor } from '@/editor/shared/utils/core';

export const vimSaveFacet = Facet.define<() => void, () => void>({
  combine: (values) => values[0] ?? (() => {}),
});

export const vimQuitFacet = Facet.define<() => void, () => void>({
  combine: (values) => values[0] ?? (() => {}),
});

export interface VimStatusState {
  mode: VimMode;
  display: string;
}

export const setVimStatusEffect = StateEffect.define<VimStatusState>();

export const vimModeField = StateField.define<VimStatusState>({
  create: () => ({ mode: 'normal', display: '' }),
  update: (state, tr) => {
    for (const effect of tr.effects) if (effect.is(setVimStatusEffect)) return effect.value;
    return state;
  },
});

const TransactionAnnotation = Annotation.define<boolean>();

class VimPlugin implements PluginValue {
  private buffer: TextBuffer;
  private ctx: VimContext;
  private pendingKeys = '';
  private isComposing = false;

  constructor(readonly view: EditorView) {
    const content = view.state.doc.toString();
    this.buffer = new TextBuffer(content);
    const head = view.state.selection.main.head;
    this.ctx = createInitialContext(offsetToCursor(content, head));

    this.requestStatusFlush();
  }

  update(update: ViewUpdate) {
    const content = this.view.state.doc.toString();

    if (update.docChanged && this.buffer.getContent() !== content) this.buffer.replaceContent(content);

    if (update.selectionSet && !update.transactions.some((tr) => tr.annotation(TransactionAnnotation))) {
      const head = update.state.selection.main.head;
      this.ctx.cursor = offsetToCursor(content, head);
    }
  }

  getMode(): VimMode {
    return this.ctx.mode;
  }

  setComposing(value: boolean) {
    this.isComposing = value;
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (this.isComposing) return false;

    if (!this.shouldConsumeKey(e)) return false;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const oldMode = this.ctx.mode;
    const { newCtx, actions } = processKeystroke(e.key, this.ctx, this.buffer, e.ctrlKey || e.metaKey);
    this.ctx = newCtx;

    this.updatePendingKeys(e.key, actions);
    this.applyActions(actions);

    if (oldMode !== this.ctx.mode || this.pendingKeys || this.ctx.statusMessage) {
      this.requestStatusFlush();
    }

    return true;
  }

  handleMouseDown() {
    setTimeout(() => {
      if (!this.view?.state) return;
      const head = this.view.state.selection.main.head;
      this.ctx.cursor = offsetToCursor(this.view.state.doc.toString(), head);
    }, 10);
  }

  private shouldConsumeKey(e: KeyboardEvent): boolean {
    const isInsert = this.ctx.mode === 'insert';
    let consume = !isInsert;

    if (isInsert) {
      const isVimEscape = e.key === 'Escape' || (e.ctrlKey && e.key === '[');
      const isVimCtrl = e.ctrlKey && ['r', 'w', 'u'].includes(e.key.toLowerCase());

      if (isVimEscape || isVimCtrl) consume = true;
    }

    if (consume && e.metaKey) consume = false;

    return consume;
  }

  private updatePendingKeys(key: string, actions: VimAction[]) {
    if (this.ctx.mode === 'command-line') {
      if (key === 'Escape' || key === 'Enter') this.pendingKeys = '';
      else if (key.length === 1) this.pendingKeys += key;
    } else if (this.ctx.mode === 'normal') {
      const isActionConsumed = actions.length > 0 && actions.every((a) => a.type !== 'noop');
      if (isActionConsumed) this.pendingKeys = '';
      else if (actions.some((a) => a.type === 'noop')) this.pendingKeys += key;
    }

    if (this.ctx.statusMessage) {
      this.pendingKeys = this.ctx.statusMessage;
    }
  }

  private applyActions(actions: VimAction[]) {
    for (const action of actions) {
      switch (action.type) {
        case 'content-change':
          this.syncContentToEditor(action.content);
          break;
        case 'cursor-move':
          this.syncCursorToEditor(action.position);
          break;
        case 'save':
          this.view.state.facet(vimSaveFacet)?.();
          break;
        case 'quit':
          this.view.state.facet(vimQuitFacet)?.();
          break;
      }
    }

    this.syncCursorToEditor(this.ctx.cursor);
  }

  private syncContentToEditor(text: string) {
    const current = this.view.state.doc.toString();
    if (current === text) return;
    this.view.dispatch({
      changes: { from: 0, to: current.length, insert: text },
      annotations: [TransactionAnnotation.of(true)],
    });
  }

  private syncCursorToEditor(pos: { line: number; col: number }) {
    const offset = cursorToOffset(this.view.state.doc.toString(), pos);
    if (this.view.state.selection.main.head !== offset) {
      this.view.dispatch({
        selection: { anchor: offset },
        scrollIntoView: true,
        annotations: [TransactionAnnotation.of(true)],
      });
    }
  }

  private requestStatusFlush() {
    if (!this.view) return;
    const mode = this.ctx.mode;
    const display = this.pendingKeys;

    requestAnimationFrame(() => {
      this.view.dispatch({
        effects: setVimStatusEffect.of({ mode, display }),
      });
    });
  }
}

const vimPluginInstance: ViewPlugin<VimPlugin> = ViewPlugin.fromClass(VimPlugin, {
  eventHandlers: {
    keydown(e, view): boolean {
      return view.plugin(vimPluginInstance)?.handleKeyDown(e) ?? false;
    },
    mousedown(_event, view) {
      view.plugin(vimPluginInstance)?.handleMouseDown();
    },
    compositionstart(e, view) {
      const p = view.plugin(vimPluginInstance);
      if (!p) return;

      if (p.getMode() !== 'insert') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      p.setComposing(true);
    },
    compositionend(_event, view) {
      view.plugin(vimPluginInstance)?.setComposing(false);
    },
  },
});

export const vimExtension: Extension = [vimModeField, Prec.high(vimPluginInstance)];
