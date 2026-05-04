import { SyntaxMode } from '@typstmate/typst-syntax';
import { StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { getActiveRegion, markdownCore, vimModeField } from '@/editor';
import { getObsidianVimMode } from '@/libs/events/vim-mode-change';
import { RenderingEngine } from '@/libs/processor';
import { type TMAction, type TMActionContext, tmActionsManager } from '@/libs/tmActionsManager';
import { consoleWarn } from '@/utils/notice';
import { executeExtraActions } from '../extras';
import { executeCommand } from './commands';
import { executeSnippet } from './snippet';

export const executeActionEffect = StateEffect.define<{
  action: TMAction;
  context: TMActionContext;
  deleteLength?: number;
  match?: RegExpMatchArray;
}>();

export function resolveActionContext(view: EditorView): TMActionContext {
  if (1 < view.state.selection.ranges.length) return 'plain';

  const region = getActiveRegion(view);
  if (!region) return 'md';
  if (region.processor?.renderingEngine === RenderingEngine.MathJax) return 'mjx';
  if (region.activeMode === SyntaxMode.Math) return 'typm';
  if (region.activeMode === SyntaxMode.Markup) return 'typ';
  if (region.activeMode === SyntaxMode.Code) return 'typc';

  return 'plain';
}

export function checkActionContext(
  view: EditorView,
  action: TMAction,
  context?: TMActionContext,
  triggerLength?: number,
): boolean {
  if (context === undefined) context = resolveActionContext(view);

  // Base context check
  if (!action.c.includes(context)) return false;

  if (action.r) {
    const isMarkdownView = !!view.plugin(markdownCore);

    // M: Markdown editor only
    if (action.r.includes('M') && !isMarkdownView) return false;
    // t: .typ editor only
    if (action.r.includes('t') && isMarkdownView) return false;

    // V: vim normal mode
    if (action.r.includes('V') && !checkVimNormalMode(view, isMarkdownView)) return false;

    const region = getActiveRegion(view);
    const isDisplay = region?.kind === 'display';
    const isInline = region?.kind === 'inline';

    // i: inline math only (typm)
    if (action.r.includes('i') && !isInline) return false;
    // b: block math only (typm)
    if (action.r.includes('b') && !isDisplay) return false;
    // I: inline math only (mjx)
    if (action.r.includes('I') && !isInline) return false;
    // D: display math only (mjx)
    if (action.r.includes('D') && !isDisplay) return false;

    // H: start of line only
    if (action.r.includes('H')) {
      const line = view.state.doc.lineAt(view.state.selection.main.head);
      const checkEnd = view.state.selection.main.head - (triggerLength ?? 0);
      const textBefore = view.state.sliceDoc(line.from, checkEnd);
      if (textBefore.trim() !== '') return false;
    }

    // E: end of line only
    if (action.r.includes('E')) {
      const line = view.state.doc.lineAt(view.state.selection.main.head);
      const textAfter = view.state.sliceDoc(view.state.selection.main.head, line.to);
      if (textAfter.trim() !== '') return false;
    }
  }

  return true;
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
  context: TMActionContext,
  action: TMAction,
  deleteLength?: number,
  match?: RegExpMatchArray,
  depth = 0,
) {
  const selection = view.state.selection.main;
  const selectionFrom = Math.min(selection.anchor, selection.head);
  const selectionTo = Math.max(selection.anchor, selection.head);
  const selectedText = selectionFrom === selectionTo ? undefined : view.state.sliceDoc(selectionFrom, selectionTo);

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
      executeSnippet(action, false, context, view, curFrom, curTo, match, selectedText);
      break;
    case 'script':
      executeSnippet(action, true, context, view, curFrom, curTo, match, selectedText);
      break;
    case 'commands': {
      const commandIds = (actionValue as string).split(',').map((id) => id.trim());
      for (const commandId of commandIds) executeCommand(commandId, view, curFrom, curTo);
      break;
    }
    // TODO
    case 'actions': {
      const actionIds = (actionValue as string).split(',').map((id) => id.trim());
      for (const actionId of actionIds) {
        const targetAction = tmActionsManager.actions.find((a) => a.id === actionId);
        if (targetAction) executeAction(view, context, targetAction, 0, match, depth + 1);
        else consoleWarn('executeAction.actions failed', actionId);
      }
      break;
    }
  }

  if (depth === 0 && context === 'md' && (actionType === 'snippet' || actionType === 'script')) {
    view.plugin(markdownCore)?.recompute(view);
  }

  if (depth === 0) executeExtraActions(view, action);
}
