import type { EditorView } from '@codemirror/view';
import { TypstMate } from '@/api';
import { applyToCurrentTabStop, snippet } from '@/editor';
import type { TMAction, TMActionContext } from '@/libs/tmActionsManager';
import { Commands, type ScriptFn } from '@/libs/tmActionsManager/definition';
import { applyExtraActions } from '../extras';

export function executeSnippet(
  action: TMAction,
  isScript: boolean,
  context: TMActionContext,

  view: EditorView,
  from: number,
  to: number,

  match?: RegExpMatchArray,
  selectedText?: string,
): boolean {
  const value = action.action.v;

  try {
    // * preprocess
    let template: string;
    if (isScript) {
      const fn = value as ScriptFn;

      const fnResult = fn(match ?? selectedText, Commands, TypstMate.ctx);
      if (typeof fnResult === 'boolean') return fnResult;

      template = fnResult;
    } else template = value as string;
    template = applyExtraActions(action, from, template, view, context);

    // * expand snippet
    snippet(template)(view, null, from, to);

    // * postprocess
    if (!isScript) {
      if (match && 1 < match.length)
        for (let i = 1; i < match.length; i++) {
          const m = match[i];
          if (m === undefined) continue;
          applyToCurrentTabStop(view, m);
        }
      else if (selectedText) applyToCurrentTabStop(view, selectedText);
    }
  } catch (e) {
    new Notice(String(e));
    return false;
  }

  return true;
}
