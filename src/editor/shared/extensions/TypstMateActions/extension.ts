import { type Extension, Prec } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { getActiveRegion } from '@/editor';
import { RenderingEngine } from '@/libs/processor';
import type { TMAction, TMActionContext } from '@/libs/tmActionsManager';
import { checkActionContext, executeAction, executeActionEffect, resolveActionContext } from './actions';

export function buildActionExtensions(actions: TMAction[], longPressDuration: number): Extension[] {
  const interceptor = Prec.highest(buildActionInterceptorPlugin(actions, longPressDuration));
  const dispatcher = buildActionDispatcherPlugin();

  return [interceptor, dispatcher];
}

class ActionInterceptorPluginValue {
  private longPressTimeout?: number;
  private pendingKey?: string;
  private savedSelection?: { anchor: number; head: number; content: string; context: TMActionContext };

  private static readonly BUFFER_SIZE = 64;
  private typeBuffer = '';
  private lastHotkeyTime = 0;
  private lastHotkeyStr = '';

  private hotkeyActions: TMAction[] = [];
  private inputActions: TMAction[] = [];
  private longPressActions: TMAction[] = [];
  private regexCache = new Map<string, RegExp>();

  constructor(
    public view: EditorView,
    actions: TMAction[],
    private longPressDuration: number,
  ) {
    this.hotkeyActions = actions.filter((a) => a.trigger.t === 'hotkey');
    this.inputActions = actions
      .filter((a) => a.trigger.t === 'type' || a.trigger.t === 'regex')
      .sort((a, b) => {
        const pA = a.p ?? 0;
        const pB = b.p ?? 0;
        if (pA !== pB) return pB - pA;

        const lenA = a.trigger.v?.length ?? 0;
        const lenB = b.trigger.v?.length ?? 0;
        return lenB - lenA;
      });
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

    const context = resolveActionContext(this.view);
    const { key, repeat, ctrlKey, metaKey, altKey, shiftKey } = e;

    if (ctrlKey || metaKey || altKey) {
      /* hot-key */

      const mod = (ctrlKey || metaKey ? 'Mod-' : '') + (altKey ? 'Alt-' : '') + (shiftKey ? 'Shift-' : '');
      const keyName = key.length === 1 ? key.toLowerCase() : key;

      const hotkeyStr = `${mod}${keyName}`;

      const hotkeyAction = this.hotkeyActions.find(
        (a) =>
          (a.trigger.v.toLowerCase() === hotkeyStr || a.trigger.v.toLowerCase() === `mod-${key.toLowerCase()}`) &&
          checkActionContext(this.view, a, context),
      );

      if (hotkeyAction) {
        const now = Date.now();
        if (repeat || (this.lastHotkeyStr === hotkeyStr && now - this.lastHotkeyTime < 500)) return true;

        this.lastHotkeyTime = now;
        this.lastHotkeyStr = hotkeyStr;

        e.preventDefault();
        e.stopPropagation();
        this.executeAction(context, hotkeyAction);
        return true;
      }
    } else if (key.length === 1) {
      /* type, regex */
      const typeMatchBuffer = this.typeBuffer + key;

      const head = this.view.state.selection.main.head;
      const lookback = 128;
      const docMatchBuffer = this.view.state.sliceDoc(Math.max(0, head - lookback), head) + key;

      for (const action of this.inputActions) {
        const t = action.trigger.t;
        const v = action.trigger.v;

        if (t === 'type') {
          if (v && typeMatchBuffer.endsWith(v) && docMatchBuffer.endsWith(v)) {
            if (!checkActionContext(this.view, action, context, v.length - 1)) continue;
            e.preventDefault();
            this.executeAction(context, action, v.length - 1);
            this.typeBuffer = '';
            return true;
          }
        } else if (t === 'regex') {
          if (!v) continue;
          const regex = this.regexCache.get(action.id);

          const match = regex ? docMatchBuffer.match(regex) : null;
          if (match) {
            const matchedStr = match[0];
            if (!checkActionContext(this.view, action, context, matchedStr.length - 1)) continue;
            e.preventDefault();
            this.executeAction(context, action, matchedStr.length - 1, match);
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
      return a.trigger.v === key && checkActionContext(this.view, a, context);
    });

    if (longPressActions.length === 0 || ctrlKey || metaKey || altKey || selection.empty) {
      this.clearLongPressTimeout();
      return false;
    }

    const region = getActiveRegion(this.view);
    if (region?.processor?.renderingEngine === RenderingEngine.MathJax) return false;

    if (repeat && this.longPressTimeout) return true;

    if (longPressActions.length > 0) {
      this.startLongPressTimeout(context, key, selection, longPressActions[0]!);
    }
    e.preventDefault();
    return true;
  }

  handleKeyUp(e: KeyboardEvent) {
    if (e.key === this.pendingKey && this.longPressTimeout) this.cancelLongPressAndInsertKey();
  }

  private startLongPressTimeout(
    context: TMActionContext,
    key: string,
    selection: { anchor: number; head: number },
    action: TMAction,
  ) {
    this.clearLongPressTimeout();
    this.pendingKey = key;
    const from = Math.min(selection.anchor, selection.head);
    const to = Math.max(selection.anchor, selection.head);

    this.savedSelection = {
      anchor: selection.anchor,
      head: selection.head,
      content: this.view.state.sliceDoc(from, to),
      context,
    };

    this.longPressTimeout = window.setTimeout(() => {
      this.executeAction(context, action);
      this.clearLongPressTimeout();
    }, this.longPressDuration);
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

  private executeAction(context: TMActionContext, action: TMAction, deleteLength?: number, match?: RegExpMatchArray) {
    this.view.dispatch({
      effects: executeActionEffect.of({ action, context, deleteLength, match }),
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

function buildActionInterceptorPlugin(actions: TMAction[], longPressDuration: number) {
  return ViewPlugin.fromClass(
    class extends ActionInterceptorPluginValue {
      constructor(view: EditorView) {
        super(view, actions, longPressDuration);
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
          executeAction(update.view, value.context, value.action, value.deleteLength, value.match);
        }
      }
    }
  });
}
