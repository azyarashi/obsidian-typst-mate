import { SyntaxMode } from '@typstmate/typst-syntax';
import { StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { vimModeField } from '@/editor/typst/extensions/Vim';
import type { Action, ActionContext } from '@/libs/action';
import { getObsidianVimMode } from '@/libs/events/vim-mode-change';
import { RenderingEngine } from '@/libs/processor';
import { executeCommand } from './command';
import { executeSnippet } from './snippet';

export const executeActionEffect = StateEffect.define<{
  action: Action;
  deleteLength?: number;
  match?: RegExpMatchArray;
}>();

export function checkActionContext(view: EditorView, action: Action): boolean {
  const region = getActiveRegion(view);

  let context: ActionContext;
  if (!region) context = 'Markdown';
  else if (region.processor?.renderingEngine === RenderingEngine.MathJax) context = 'MathJax';
  else if (region.activeMode === SyntaxMode.Math) context = 'Math';
  else if (region.activeMode === SyntaxMode.Markup) context = 'Markup';
  else if (region.activeMode === SyntaxMode.Code) context = 'Code';
  else context = 'Opaque';

  return (
    action.contexts.includes(context) &&
    (!action.contexts.includes('Vim') || checkVimNormalMode(view, !region || region.processor !== undefined))
  );
}

function checkVimNormalMode(view: EditorView, isMarkdownView: boolean): boolean {
  try {
    const mode = isMarkdownView ? getObsidianVimMode(view) : view.state.field(vimModeField, false)?.mode;
    return mode === 'normal';
  } catch {}

  return false;
}

export function executeAction(view: EditorView, action: Action, deleteLength?: number, match?: RegExpMatchArray) {
  const selection = view.state.selection.main;
  const selectionFrom = Math.min(selection.anchor, selection.head);
  const selectionTo = Math.max(selection.anchor, selection.head);
  const selectedText = view.state.sliceDoc(selectionFrom, selectionTo);

  // 選択範囲 または type / match の検出範囲を削除
  if (deleteLength && 0 < deleteLength) {
    view.dispatch({
      changes: { from: selectionFrom - deleteLength, to: selectionFrom },
    });
  }

  // Refetch selection after potential deletion
  const currentSel = view.state.selection.main;
  const curFrom = Math.min(currentSel.anchor, currentSel.head);
  const curTo = Math.max(currentSel.anchor, currentSel.head);

  const actionType = action.action.t;
  switch (actionType) {
    case 'snippet':
      executeSnippet(action, view, selectedText, curFrom, curTo, false);
      break;
    case 'script':
      executeSnippet(action, view, selectedText, curFrom, curTo, true, match);
      break;
    case 'command':
      executeCommand(action, view, curFrom, curTo);
      break;
  }
}
