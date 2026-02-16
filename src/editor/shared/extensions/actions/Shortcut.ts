import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import SHORTCUTS_DATA from '@/data/shortcuts.json';
import { getActiveRegion } from '../core/TypstMate';

const SHORTCUTS_KEYS = Object.keys(SHORTCUTS_DATA);
const SHORTCUT_DELAY = 250;

class ShortcutPluginValue {
  timeoutId?: number;
  pendingKey?: string;
  savedSelection?: { anchor: number; head: number; content: string };

  constructor(public view: EditorView) {}

  update(_update: ViewUpdate) {}

  destroy() {
    this.clearTimeout();
  }

  clearTimeout() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
      this.pendingKey = undefined;
      this.savedSelection = undefined;
    }
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    const region = getActiveRegion(this.view);
    if (!region) return false;

    const { key, repeat, ctrlKey, metaKey, altKey } = e;
    const selection = this.view.state.selection.main;

    if (!SHORTCUTS_KEYS.includes(key) || ctrlKey || metaKey || altKey || selection.empty) {
      this.clearTimeout();
      return false;
    }

    e.preventDefault();

    if (repeat && this.timeoutId) return true;

    this.startShortcutTimeout(key, selection);
    return true;
  }

  handleKeyUp(e: KeyboardEvent) {
    if (e.key === this.pendingKey && this.timeoutId) this.cancelShortcutAndInsertKey();
  }

  private cancelShortcutAndInsertKey() {
    if (!this.savedSelection || !this.pendingKey) {
      this.clearTimeout();
      return;
    }

    const start = Math.min(this.savedSelection.anchor, this.savedSelection.head);
    const end = Math.max(this.savedSelection.anchor, this.savedSelection.head);

    this.view.dispatch({
      changes: { from: start, to: end, insert: this.pendingKey },
      selection: { anchor: start + this.pendingKey.length },
    });

    this.clearTimeout();
  }

  private startShortcutTimeout(key: string, selection: { anchor: number; head: number; from: number; to: number }) {
    this.clearTimeout();

    this.pendingKey = key;
    this.savedSelection = {
      anchor: selection.anchor,
      head: selection.head,
      content: this.view.state.sliceDoc(selection.from, selection.to),
    };

    this.timeoutId = window.setTimeout(() => {
      this.executeShortcut(key);
      this.clearTimeout();
    }, SHORTCUT_DELAY);
  }

  private executeShortcut(key: string) {
    if (!this.savedSelection) return;

    const data = (SHORTCUTS_DATA as Record<string, { content: string; offset: number }>)[key];
    if (!data) return;

    const insertContent = data.content.replaceAll('$1', this.savedSelection.content);
    const insertStart = Math.min(this.savedSelection.anchor, this.savedSelection.head);
    const insertEnd = Math.max(this.savedSelection.anchor, this.savedSelection.head);
    const newPosition = insertStart + insertContent.length;

    this.view.dispatch({
      changes: { from: insertStart, to: insertEnd, insert: insertContent },
      selection: { anchor: data.offset ? newPosition + data.offset : newPosition },
    });
  }
}

export const shortcutPlugin = ViewPlugin.fromClass(ShortcutPluginValue);

export const shortcutExtension = [
  shortcutPlugin,
  EditorView.domEventHandlers({
    keydown: (e, view) => view.plugin(shortcutPlugin)?.handleKeyDown(e) ?? false,
    keyup: (e, view) => view.plugin(shortcutPlugin)?.handleKeyUp(e),
    mousedown: (_e, view) => view.plugin(shortcutPlugin)?.clearTimeout(),
  }),
];
