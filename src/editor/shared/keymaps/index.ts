import { type Extension, Prec } from '@codemirror/state';
import { EditorView, type KeyBinding, keymap, type ViewUpdate } from '@codemirror/view';
import { appUtils, settingsManager } from '@/libs';
import type { ActionDef } from '@/libs/action';
import { buildActionInterceptorPlugin, executeActionEffect } from './interceptor';

/**
 * Executes the specified action on the given editor view.
 */
function executeActionOnView(view: EditorView, action: ActionDef, deleteLength?: number, match?: RegExpMatchArray) {
  console.log(action);

  const selection = view.state.selection.main;
  const from = Math.min(selection.anchor, selection.head);
  const to = Math.max(selection.anchor, selection.head);
  const selectedText = view.state.sliceDoc(from, to);

  // If we have a trigger string that needs to be deleted (type/regex triggers)
  if (deleteLength && deleteLength > 0) {
    view.dispatch({
      changes: { from: from - deleteLength, to: from, insert: '' },
    });
  }

  // Refetch selection after potential deletion
  const currentSel = view.state.selection.main;
  const curFrom = Math.min(currentSel.anchor, currentSel.head);
  const curTo = Math.max(currentSel.anchor, currentSel.head);

  const actionType = action.action.t;
  const actionValue = action.action.v;

  const triggerType = action.trigger.t;
  const isHotkeyOrLongPress = triggerType === 'hotkey' || triggerType === 'long-press';

  if (actionType === 'snippet') {
    let insertContent = actionValue;

    // Requirement: Replace first #CURSOR with selected text if hotkey/long-press
    if (selectedText && isHotkeyOrLongPress && insertContent.includes('#CURSOR')) {
      insertContent = insertContent.replace('#CURSOR', selectedText);
    }

    let cursorOffset = -1;
    if (insertContent.includes('#CURSOR')) {
      const firstCursorIdx = insertContent.indexOf('#CURSOR');
      // Remove the next #CURSOR and place the real cursor there
      insertContent = insertContent.replace('#CURSOR', '');
      cursorOffset = firstCursorIdx;
    } else {
      cursorOffset = insertContent.length;
    }

    view.dispatch({
      changes: { from: curFrom, to: curTo, insert: insertContent },
      selection: { anchor: curFrom + cursorOffset },
      userEvent: 'input.snippet',
      scrollIntoView: true,
    });
  } else if (actionType === 'script') {
    try {
      // Requirement: Pass selected text as 'match' if provided
      const scriptMatch = match || (selectedText ? ([selectedText] as unknown as RegExpMatchArray) : undefined);

      // Pass 'view', 'app', and 'match' to the script
      const fn = new Function('view', 'app', 'match', actionValue);
      const result = fn(view, appUtils.app, scriptMatch);

      if (typeof result === 'string') {
        view.dispatch({
          changes: { from: curFrom, to: curTo, insert: result },
          selection: { anchor: curFrom + result.length },
          userEvent: 'input.script',
          scrollIntoView: true,
        });
      }
    } catch (e) {
      console.error('Failed to execute script action:', e);
    }
  } else if (actionType === 'command') {
    const commandId = actionValue;
    const command = appUtils.app.commands.findCommand(commandId);
    console.log(appUtils.app.commands, command);
    if (command !== undefined) {
      if (commandId === 'typst-mate:run-typstyle') {
        // @ts-expect-error
        command.editorCallback!({ cm: view }, {});
        new Notice('run-typstyle');
      } else {
        const isSuccess = appUtils.app.commands.executeCommandById(commandId);
        if (!isSuccess) new Notice(`Command not executed: ${commandId}`);
      }
    } else {
      new Notice(`Command not found: ${commandId}`);
    }
  }
}

/**
 * 登録された Action のうち、ShortcutTrigger に該当するものを抽出して
 * CodeMirror の KeyBinding 配列としてビルドし、Extension 化する関数
 */
function buildActionKeymapExtension(actions: ActionDef[]): Extension {
  const bindings: KeyBinding[] = [];

  for (const action of actions) {
    if (action.trigger.t === 'hotkey') {
      // skip empty bindings
      const key = action.trigger.v;
      if (!key) continue;

      bindings.push({
        key,
        run: (view) => {
          if (view.composing) return false; // IME

          const currentAction = settingsManager.settings.actions.find((a) => a.id === action.id) || action;

          executeActionOnView(view, currentAction);
          return true;
        },
      });
    }
  }

  // Use Prec.highest to ensure custom actions override default keybindings (like Mod-s)
  return Prec.highest(keymap.of(bindings));
}

// ---------------------------------------------------------------------------
// Build entire action system for the editor instance
// ---------------------------------------------------------------------------
export function buildActionExtensions(actions: ActionDef[], longPressDelayMs: number): Extension[] {
  const shortcuts = buildActionKeymapExtension(actions);
  const interceptor = buildActionInterceptorPlugin(actions, longPressDelayMs);

  const actionDispatcher = EditorView.updateListener.of((update: ViewUpdate) => {
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(executeActionEffect)) {
          executeActionOnView(update.view, effect.value.action, effect.value.deleteLength, effect.value.match);
        }
      }
    }
  });

  return [shortcuts, interceptor, actionDispatcher];
}
