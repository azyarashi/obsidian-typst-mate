import { type Extension, Prec } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { Action } from '@/libs/action';
import { RenderingEngine } from '@/libs/processor';
import { getActiveRegion } from '../../utils/core';
import { checkActionContext, executeAction, executeActionEffect } from './actions';

export function buildActionExtensions(actions: Action[], longPressDelayMs: number): Extension[] {
  actions = actions.filter((a) => a.trigger?.t && a.trigger.v && a.action?.t && a.action.v && a.contexts?.length > 0);

  const interceptor = Prec.highest(buildActionInterceptorPlugin(actions, longPressDelayMs));
  const dispatcher = buildActionDispatcherPlugin();

  return [interceptor, dispatcher];
}

class ActionInterceptorPluginValue {
  private longPressTimeout?: number;
  private pendingKey?: string;
  private savedSelection?: { anchor: number; head: number; content: string };

  private static readonly BUFFER_SIZE = 64;
  private typeBuffer = '';
  private lastHotkeyTime = 0;
  private lastHotkeyStr = '';

  private hotkeyActions: Action[] = [];
  private inputActions: Action[] = [];
  private longPressActions: Action[] = [];
  private regexCache = new Map<string, RegExp>();

  constructor(
    public view: EditorView,
    actions: Action[],
    private longPressDelay: number,
  ) {
    this.hotkeyActions = actions.filter((a) => a.trigger.t === 'hotkey');
    this.inputActions = actions.filter((a) => a.trigger.t === 'type' || a.trigger.t === 'regex');
    this.longPressActions = actions.filter((a) => a.trigger.t === 'long-press');

    for (const action of this.inputActions) {
      if (action.trigger.t === 'regex') {
        try {
          this.regexCache.set(action.id, new RegExp(`${action.trigger.v}$`));
        } catch {
          // TODO
        }
      }
    }
  }

  update(update: ViewUpdate) {
    if (update.selectionSet || update.docChanged) {
      const isDelete = update.transactions.some((tr) => tr.isUserEvent('delete'));
      const isTyping = update.transactions.some((tr) => tr.isUserEvent('input.type') || tr.isUserEvent('input'));

      if (isDelete || (update.selectionSet && !isTyping)) this.typeBuffer = '';
    }
  }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (this.view.composing) return false;
    const { key, repeat, ctrlKey, metaKey, altKey, shiftKey } = e;

    if (ctrlKey || metaKey || altKey) {
      /* hot-key */

      const mod = (ctrlKey || metaKey ? 'Mod-' : '') + (altKey ? 'Alt-' : '') + (shiftKey ? 'Shift-' : '');
      const keyName = key.length === 1 ? key.toLowerCase() : key;

      const hotkeyStr = `${mod}${keyName}`;

      const hotkeyAction = this.hotkeyActions.find(
        (a) =>
          (a.trigger.v.toLowerCase() === hotkeyStr || a.trigger.v.toLowerCase() === `mod-${key.toLowerCase()}`) &&
          checkActionContext(this.view, a),
      );

      if (hotkeyAction) {
        const now = Date.now();
        if (repeat || (this.lastHotkeyStr === hotkeyStr && now - this.lastHotkeyTime < 500)) return true;

        this.lastHotkeyTime = now;
        this.lastHotkeyStr = hotkeyStr;

        e.preventDefault();
        e.stopPropagation();
        this.executeAction(hotkeyAction);
        return true;
      }
    } else if (key.length === 1) {
      /* type, regex */
      const typeMatchBuffer = this.typeBuffer + key;

      const head = this.view.state.selection.main.head;
      const lookback = 128;
      const docMatchBuffer = this.view.state.sliceDoc(Math.max(0, head - lookback), head) + key;

      for (const action of this.inputActions) {
        if (!checkActionContext(this.view, action)) continue;

        const t = action.trigger.t;
        const v = action.trigger.v;

        if (t === 'type') {
          if (v && typeMatchBuffer.endsWith(v) && docMatchBuffer.endsWith(v)) {
            e.preventDefault();
            this.executeAction(action, v.length - 1);
            this.typeBuffer = '';
            return true;
          }
        } else if (t === 'regex') {
          if (!v) continue;
          const regex = this.regexCache.get(action.id);

          const match = regex ? docMatchBuffer.match(regex) : null;
          if (match) {
            const matchedStr = match[0];
            e.preventDefault();
            this.executeAction(action, matchedStr.length - 1, match);
            this.typeBuffer = '';
            return true;
          }
        }
      }

      this.typeBuffer = typeMatchBuffer.slice(-ActionInterceptorPluginValue.BUFFER_SIZE);
    }

    // long-press
    const selection = this.view.state.selection.main;
    const longPressActions = this.longPressActions.filter((a) => {
      return a.trigger.v === key && checkActionContext(this.view, a);
    });

    if (longPressActions.length === 0 || ctrlKey || metaKey || altKey || selection.empty) {
      this.clearLongPressTimeout();
      return false;
    }

    const region = getActiveRegion(this.view);
    if (region?.processor?.renderingEngine === RenderingEngine.MathJax) return false;

    if (repeat && this.longPressTimeout) return true;

    if (longPressActions.length > 0) {
      this.startLongPressTimeout(key, selection, longPressActions[0]!);
    }
    e.preventDefault();
    return true;
  }

  handleKeyUp(e: KeyboardEvent) {
    if (e.key === this.pendingKey && this.longPressTimeout) this.cancelLongPressAndInsertKey();
  }

  private startLongPressTimeout(key: string, selection: { anchor: number; head: number }, action: Action) {
    this.clearLongPressTimeout();
    this.pendingKey = key;
    const from = Math.min(selection.anchor, selection.head);
    const to = Math.max(selection.anchor, selection.head);

    this.savedSelection = {
      anchor: selection.anchor,
      head: selection.head,
      content: this.view.state.sliceDoc(from, to),
    };

    this.longPressTimeout = window.setTimeout(() => {
      this.executeAction(action);
      this.clearLongPressTimeout();
    }, this.longPressDelay);
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

  private executeAction(action: Action, deleteLength?: number, match?: RegExpMatchArray) {
    this.view.dispatch({
      effects: executeActionEffect.of({ action, deleteLength, match }),
      userEvent: `action.${action.action.t}`,
      scrollIntoView: true,
    });
  }

  handleMouseDown() {
    this.clearLongPressTimeout();
  }

  destroy() {
    this.clearLongPressTimeout();
  }

  private clearLongPressTimeout() {
    if (this.longPressTimeout) {
      window.clearTimeout(this.longPressTimeout);
      this.longPressTimeout = undefined;
      this.pendingKey = undefined;
      this.savedSelection = undefined;
    }
  }
}

function buildActionInterceptorPlugin(actions: Action[], longPressDelayMs: number) {
  return ViewPlugin.fromClass(
    class extends ActionInterceptorPluginValue {
      constructor(view: EditorView) {
        super(view, actions, longPressDelayMs);
      }
    },
    {
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
    },
  );
}

/* dispatcher */

function buildActionDispatcherPlugin() {
  return EditorView.updateListener.of((update: ViewUpdate) => {
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(executeActionEffect)) {
          const value = effect.value;
          executeAction(update.view, value.action, value.deleteLength, value.match);
        }
      }
    }
  });
}
