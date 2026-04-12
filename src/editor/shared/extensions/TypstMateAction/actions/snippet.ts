import type { EditorView } from '@codemirror/view';
import type { Action } from '@/libs/action';
import { clearTabStopEffect, jumpToFirstTabStop, TAB_STOP_REGEX } from '../../TabJump';

export function executeSnippet(
  action: Action,
  view: EditorView,
  selectedText: string,
  from: number,
  to: number,
  isScript: boolean,
  match?: RegExpMatchArray,
) {
  const value = action.action.v;

  if (isScript) {
    try {
      const fn = new Function('input', value);
      const result = String(fn(match ?? selectedText));
      view.dispatch({
        changes: { from, to, insert: result },
        selection: { anchor: from + result.length },
        effects: clearTabStopEffect.of(),
        userEvent: 'input.script',
        scrollIntoView: true,
      });
    } catch (e) {
      console.error('Failed to execute script action:', e);
    }
    return;
  }

  const hasTabStops = new RegExp(TAB_STOP_REGEX.source).test(value);

  view.dispatch({
    changes: { from, to, insert: value },
    selection: { anchor: from + value.length },
    effects: clearTabStopEffect.of(),
    userEvent: 'input.snippet',
    scrollIntoView: true,
  });

  if (hasTabStops) jumpToFirstTabStop(view, from, from + value.length);
}
