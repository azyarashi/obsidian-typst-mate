import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import SHORTCUTS_DATA from '@/data/shortcuts.json';
import { RenderingEngine } from '@/libs/processor';
// import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

const SHORTCUTS_KEYS = Object.keys(SHORTCUTS_DATA);
const SHORTCUT_DELAY = 250;

class ShortcutPluginValue {
  private timeoutId?: number;
  private pendingKey?: string;
  private savedSelection?: { anchor: number; head: number; content: string };

  constructor(public view: EditorView) {}

  update(update: ViewUpdate) {
    if (update.docChanged && this.timeoutId) this.clearTimeout();
  }

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
    const { key, repeat, ctrlKey, metaKey, altKey } = e;

    const selection = this.view.state.selection.main;
    if (!SHORTCUTS_KEYS.includes(key) || ctrlKey || metaKey || altKey || selection.empty) {
      this.clearTimeout();
      return false;
    }

    const region = getActiveRegion(this.view);
    if (!region) return false;
    if (region.processor && region.processor.renderingEngine === RenderingEngine.MathJax) return false;

    if (repeat && this.timeoutId) return true;

    this.startShortcutTimeout(key, selection);
    e.preventDefault();
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

    const { anchor, head } = this.savedSelection;
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);

    this.view.dispatch({
      changes: { from, to, insert: this.pendingKey },
      selection: { anchor: from + this.pendingKey.length },
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

    // TODO: const helper = this.view.state.facet(editorHelperFacet);
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
    const from = Math.min(this.savedSelection.anchor, this.savedSelection.head);
    const to = Math.max(this.savedSelection.anchor, this.savedSelection.head);

    this.view.dispatch({
      changes: { from, to, insert: insertContent },
      selection: {
        anchor: data.offset !== undefined ? from + data.offset : from + insertContent.length,
      },
      userEvent: 'input.shortcut',
      scrollIntoView: true,
    });
  }
}

export const shortcutExtension = ViewPlugin.fromClass(ShortcutPluginValue, {
  eventHandlers: {
    keydown(e) {
      return this.handleKeyDown(e);
    },
    keyup(e) {
      this.handleKeyUp(e);
    },
    mousedown() {
      this.clearTimeout();
    },
  },
});
