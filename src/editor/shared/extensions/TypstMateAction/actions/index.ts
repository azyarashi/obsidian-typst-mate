import { SyntaxMode } from '@typstmate/typst-syntax';
import { StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { markdownCore } from '@/editor/markdown/extensions/MarkdownCore/extension';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { vimModeField } from '@/editor/typst/extensions/Vim';
import { settingsManager } from '@/libs';
import type { Action, ActionContext } from '@/libs/action';
import { getObsidianVimMode } from '@/libs/events/vim-mode-change';
import { RenderingEngine } from '@/libs/processor';
import { executeCommand } from './command';
import { executeSnippet } from './snippet';

export const executeActionEffect = StateEffect.define<{
  action: Action;
  context: ActionContext;
  deleteLength?: number;
  match?: RegExpMatchArray;
}>();

export function resolveActionContext(view: EditorView): ActionContext {
  const region = getActiveRegion(view);

  if (!region) return 'Markdown';
  if (region.processor?.renderingEngine === RenderingEngine.MathJax) return 'MathJax';
  if (region.activeMode === SyntaxMode.Math) return 'Math';
  if (region.activeMode === SyntaxMode.Markup) return 'Markup';
  if (region.activeMode === SyntaxMode.Code) return 'Code';

  return 'Opaque';
}

export function checkActionContext(view: EditorView, action: Action, context?: ActionContext): boolean {
  if (context === undefined) context = resolveActionContext(view);

  return (
    action.contexts.includes(context) &&
    (!action.contexts.includes('Vim') || checkVimNormalMode(view, !!view.plugin(markdownCore)))
  );
}

function checkVimNormalMode(view: EditorView, isMarkdownView: boolean): boolean {
  try {
    const mode = isMarkdownView ? getObsidianVimMode(view) : view.state.field(vimModeField, false)?.mode;
    return mode === 'normal';
  } catch {}

  return false;
}

export function executeAction(
  view: EditorView,
  context: ActionContext,
  action: Action,
  deleteLength?: number,
  match?: RegExpMatchArray,
  depth = 0,
) {
  const selection = view.state.selection.main;
  const selectionFrom = Math.min(selection.anchor, selection.head);
  const selectionTo = Math.max(selection.anchor, selection.head);
  const selectedText = view.state.sliceDoc(selectionFrom, selectionTo);

  if (depth === 0 && deleteLength && 0 < deleteLength) {
    view.dispatch({
      changes: { from: selectionFrom - deleteLength, to: selectionFrom },
    });
  }

  const currentSel = view.state.selection.main;
  const curFrom = Math.min(currentSel.anchor, currentSel.head);
  const curTo = Math.max(currentSel.anchor, currentSel.head);

  const actionType = action.action.t;
  const actionValue = action.action.v;
  switch (actionType) {
    case 'snippet':
      executeSnippet(action, view, selectedText, curFrom, curTo, false);
      break;
    case 'script':
      executeSnippet(action, view, selectedText, curFrom, curTo, true, match);
      break;
    case 'command': {
      const commandIds = actionValue.split(',').map((id) => id.trim());
      for (const commandId of commandIds) executeCommand(commandId, view, curFrom, curTo);
      break;
    }
    case 'action': {
      const actionIds = actionValue.split(',').map((id) => id.trim());
      for (const actionId of actionIds) {
        const targetAction = settingsManager.settings.actions.find((a) => a.id === actionId);
        if (targetAction) executeAction(view, context, targetAction, 0, match, depth + 1);
        else console.warn(`Action with ID "${actionId}" not found.`);
      }
      break;
    }
  }

  if (depth === 0 && context === 'Markdown' && (actionType === 'snippet' || actionType === 'script')) {
    view.plugin(markdownCore)?.recompute(view);
  }
}
