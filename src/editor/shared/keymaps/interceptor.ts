import { StateEffect } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { SyntaxMode } from '@typstmate/typst-syntax';
import { settingsManager } from '@/libs';
import type { ActionDef } from '@/libs/action';
import { RenderingEngine } from '@/libs/processor';
import { getActiveRegion } from '../utils/core';

export const executeActionEffect = StateEffect.define<{
  action: ActionDef;
  deleteLength?: number;
  match?: RegExpMatchArray;
}>();

export function checkActionContext(view: EditorView, action: ActionDef): boolean {
  if (!action.contexts || action.contexts.length === 0) return true;

  const region = getActiveRegion(view);
  if (!region) return action.contexts.includes('Markdown');

  // Determine context from region
  let currentContext = 'Markdown';
  if (region.processor?.renderingEngine === RenderingEngine.MathJax) currentContext = 'MathJax';
  else if (region.activeMode === SyntaxMode.Math) currentContext = 'Math';
  else if (region.activeMode === SyntaxMode.Markup) currentContext = 'Markup';
  else if (region.activeMode === SyntaxMode.Code) currentContext = 'Code';
  else currentContext = 'Opaque';

  return action.contexts.includes(currentContext as any);
}

export class ActionInterceptorPluginValue {
  private longPressTimeout?: number;
  private pendingKey?: string;
  private savedSelection?: { anchor: number; head: number; content: string };

  // For type/regex triggers
  private typeBuffer = '';
  private lastHotkeyTime = 0;
  private lastHotkeyStr = '';

  constructor(
    public view: EditorView,
    private actions: ActionDef[],
    private longPressDelay: number,
  ) {}

  clearLongPressTimeout() {
    if (this.longPressTimeout) {
      window.clearTimeout(this.longPressTimeout);
      this.longPressTimeout = undefined;
      this.pendingKey = undefined;
      this.savedSelection = undefined;
    }
  }

  destroy() {
    this.clearLongPressTimeout();
  }

  update(update: ViewUpdate) {
    if (update.selectionSet || update.docChanged) {
      const isDelete = update.transactions.some((tr) => tr.isUserEvent('delete'));
      const isTyping = update.transactions.some((tr) => tr.isUserEvent('input.type') || tr.isUserEvent('input'));

      // Reset buffer on character deletion or manual cursor movement (e.g. arrow keys, clicking)
      // We don't reset if it's normal typing (both docChanged and selectionSet are true)
      if (isDelete || (update.selectionSet && !isTyping)) {
        this.typeBuffer = '';
      }
    }
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    console.log(e);
    if (this.view.composing) return false;
    const { key, repeat, ctrlKey, metaKey, altKey, shiftKey } = e;

    // ============================================
    // 0. Hotkey Trigger Check (High Priority)
    // ============================================
    // Check for hotkeys even if modifiers are pressed, to beat host-app defaults (like Mod-s)
    if (ctrlKey || metaKey || altKey) {
      // Basic normalization of the key string to match "Mod-s", "Mod-Alt-k" etc.
      const mod = (ctrlKey || metaKey ? 'Mod-' : '') + (altKey ? 'Alt-' : '') + (shiftKey ? 'Shift-' : '');
      const hotkeyStr = `${mod}${key.toLowerCase()}`;

      const hotkeyAction = this.actions.find((a) => {
        return (
          a.trigger.t === 'hotkey' &&
          (a.trigger.v.toLowerCase() === hotkeyStr || a.trigger.v.toLowerCase() === `mod-${key.toLowerCase()}`) &&
          checkActionContext(this.view, a)
        );
      });

      if (hotkeyAction) {
        const now = Date.now();
        // Debounce: ignore same hotkey within 500ms if not explicitly marked as repeat
        if (repeat || (this.lastHotkeyStr === hotkeyStr && now - this.lastHotkeyTime < 500)) {
          console.log('[Interceptor] Ignoring duplicate/repeat hotkey:', hotkeyStr);
          return true;
        }

        this.lastHotkeyTime = now;
        this.lastHotkeyStr = hotkeyStr;

        console.log('Immediate Hotkey Triggered:', hotkeyStr);
        e.preventDefault();
        e.stopPropagation();
        this.executeAction(hotkeyAction);
        return true;
      }
    }

    // ============================================
    // 1. Input Trigger Check (Type & Regex)
    // ============================================
    if (!ctrlKey && !metaKey && !altKey && key.length === 1) {
      const currentBuffer = this.typeBuffer + key;
      const inputActions = settingsManager.settings.actions.filter((a) => {
        const t = a.trigger.t;
        const isTypeTrigger = t === 'type';
        const isRegexTrigger = t === 'regex';
        return (isTypeTrigger || isRegexTrigger) && checkActionContext(this.view, a);
      });

      for (const action of inputActions) {
        const t = action.trigger.t;
        const v = action.trigger.v;

        if (t === 'type') {
          if (v && currentBuffer.endsWith(v)) {
            e.preventDefault();
            this.executeAction(action, v.length - 1); // Delete already typed part
            this.typeBuffer = '';
            return true;
          }
        } else if (t === 'regex') {
          const regexStr = v;
          if (!regexStr) continue;
          const regex = new RegExp(`${regexStr}$`);
          const match = currentBuffer.match(regex);
          if (match) {
            e.preventDefault();
            this.executeAction(action, match[0].length - 1, match);
            this.typeBuffer = '';
            return true;
          }
        }
      }
      this.typeBuffer = currentBuffer;
    }

    // ============================================
    // 2. Long Press Trigger Check
    // ============================================
    const selection = this.view.state.selection.main;
    const longPressActions = settingsManager.settings.actions.filter((a) => {
      const t = a.trigger.t;
      const v = a.trigger.v;

      return t === 'long-press' && v === key && checkActionContext(this.view, a);
    });

    if (longPressActions.length === 0 || ctrlKey || metaKey || altKey || selection.empty) {
      this.clearLongPressTimeout();
      return false;
    }

    const region = getActiveRegion(this.view);
    if (region?.processor?.renderingEngine === RenderingEngine.MathJax) return false;

    if (repeat && this.longPressTimeout) return true;

    if (longPressActions.length > 0) {
      this.startLongPressTimeout(key, selection, longPressActions[0] as ActionDef);
    }
    e.preventDefault();
    return true;
  }

  handleKeyUp(e: KeyboardEvent) {
    if (e.key === this.pendingKey && this.longPressTimeout) {
      // Key was released before timeout -> cancel long press and insert character normally
      this.cancelLongPressAndInsertKey();
    }
  }

  handleMouseDown() {
    this.clearLongPressTimeout();
  }

  private startLongPressTimeout(key: string, selection: { anchor: number; head: number }, action: ActionDef) {
    this.clearLongPressTimeout();

    this.pendingKey = key;
    const from = Math.min(selection.anchor, selection.head);
    const to = Math.max(selection.anchor, selection.head);

    this.savedSelection = {
      anchor: selection.anchor,
      head: selection.head,
      content: this.view.state.sliceDoc(from, to),
    };

    const delay = this.longPressDelay;

    this.longPressTimeout = window.setTimeout(() => {
      this.executeAction(action);
      this.clearLongPressTimeout();
    }, delay);
  }

  private cancelLongPressAndInsertKey() {
    if (!this.savedSelection || !this.pendingKey) {
      this.clearLongPressTimeout();
      return;
    }

    const { anchor, head } = this.savedSelection;
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);

    this.view.dispatch({
      changes: { from, to, insert: this.pendingKey },
      selection: { anchor: from + this.pendingKey.length },
    });

    this.clearLongPressTimeout();
  }

  private executeAction(action: ActionDef, deleteLength?: number, match?: RegExpMatchArray) {
    this.view.dispatch({
      effects: executeActionEffect.of({ action, deleteLength, match }),
      userEvent: `action.${action.action.t}`,
      scrollIntoView: true,
    });
  }
}

export function buildActionInterceptorPlugin(actions: ActionDef[], longPressDelayMs: number) {
  const PluginClass = class extends ActionInterceptorPluginValue {
    constructor(view: EditorView) {
      super(view, actions, longPressDelayMs);
    }
  };

  return ViewPlugin.fromClass(PluginClass, {
    eventHandlers: {
      keydown(e) {
        return this.handleKeyDown(e);
      },
      keyup(e) {
        this.handleKeyUp(e);
      },
      mousedown() {
        this.handleMouseDown();
      },
    },
  });
}
