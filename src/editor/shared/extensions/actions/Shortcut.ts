import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import SHORTCUTS_DATA from '@/data/shortcuts.json';

import { typstMateCore } from '../core/TypstMate';

const SHORTCUTS_KEYS = Object.keys(SHORTCUTS_DATA);

export class ShortcutPluginValue {
  currShortcutTimeoutId?: number;
  pendingShortcutKey?: string;
  savedSelection?: {
    anchor: number;
    head: number;
    content: string;
  };

  constructor(public view: EditorView) {}

  update(_update: ViewUpdate) {}

  destroy() {
    this.clearShortcutTimeout();
  }

  clearShortcutTimeout() {
    if (this.currShortcutTimeoutId) {
      window.clearTimeout(this.currShortcutTimeoutId);
      this.currShortcutTimeoutId = undefined;
      this.pendingShortcutKey = undefined;
      this.savedSelection = undefined;
    }
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    const view = this.view;
    const parserData = view.plugin(typstMateCore);
    if (!parserData) return false;

    const cursor = view.state.selection.main.head;
    const region = parserData.parsedRegions.find((r) => r.from <= cursor && cursor <= r.to);
    if (!region) return false;

    if (SHORTCUTS_KEYS.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && !view.state.selection.main.empty) {
      if (e.repeat && this.currShortcutTimeoutId) {
        e.preventDefault();
        return true;
      }

      if (this.currShortcutTimeoutId) this.clearShortcutTimeout();

      this.pendingShortcutKey = e.key;
      const selection = view.state.selection.main;
      this.savedSelection = {
        anchor: selection.anchor,
        head: selection.head,
        content: view.state.sliceDoc(selection.from, selection.to),
      };

      this.currShortcutTimeoutId = window.setTimeout(() => {
        // Restore selection
        if (this.savedSelection) {
          const start = Math.min(this.savedSelection.head, this.savedSelection.anchor);

          view.dispatch({
            changes: { from: start, to: start + 1, insert: this.savedSelection.content }, // Replace the typed char with original content
            selection: { anchor: this.savedSelection.anchor, head: this.savedSelection.head }, // Restore selection
          });
        }
        this.executeShortcut(e);
        this.clearShortcutTimeout();
      }, 250);
      return false;
    }

    this.clearShortcutTimeout();
    return false;
  }

  handleKeyUp(e: KeyboardEvent) {
    if (e.key === this.pendingShortcutKey) {
      this.clearShortcutTimeout();
    }
  }

  executeShortcut(e: KeyboardEvent) {
    const view = this.view;
    const selection = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
    if (!selection) return;

    const data = (SHORTCUTS_DATA as Record<string, { content: string; offset: number }>)[e.key]!;

    const insertContent = data.content.replaceAll('$1', selection);
    view.dispatch({
      changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: insertContent },
      selection: { anchor: view.state.selection.main.from + insertContent.length },
    });

    if (!data.offset) return;

    const currentHead = view.state.selection.main.head;
    view.dispatch({
      selection: { anchor: currentHead + data.offset },
    });
  }
}

export const shortcutPlugin = ViewPlugin.fromClass(ShortcutPluginValue);

import { EditorView as View } from '@codemirror/view';

export const shortcutExtension = [
  shortcutPlugin,
  View.domEventHandlers({
    keydown: (e, view) => {
      const plugin = view.plugin(shortcutPlugin);
      return plugin?.handleKeyDown(e) ?? false;
    },
    keyup: (e, view) => {
      const plugin = view.plugin(shortcutPlugin);
      plugin?.handleKeyUp(e);
    },
    mousedown: (_e, view) => {
      const plugin = view.plugin(shortcutPlugin);
      plugin?.clearShortcutTimeout();
    },
  }),
];
