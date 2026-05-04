import type { EditorView } from '@codemirror/view';
import { startAutocomplete } from '@/editor';
import type { TMAction, TMActionContext } from '@/libs/tmActionsManager';

export function applyExtraActions(
  tmAction: TMAction,
  triggerStartPos: number,
  result: string,

  view: EditorView,
  context?: TMActionContext,
): string {
  const extras = tmAction.e;
  if (!extras) return result;

  if (extras.includes('H') && context === 'typ') result = `#${result}`;

  if (extras.includes('B')) {
    const line = view.state.doc.lineAt(triggerStartPos);
    const textBefore = view.state.doc.sliceString(line.from, triggerStartPos);

    if (textBefore !== '' && !textBefore.endsWith(' ') && textBefore.trim() !== '') result = ` ${result}`;
  }

  if (extras.includes('s')) result += result.endsWith(' ') ? '${}' : ' ${}';

  if (extras.includes('l')) {
    const line = view.state.doc.lineAt(triggerStartPos);
    const textBefore = view.state.doc.sliceString(line.from, triggerStartPos);
    const indent = textBefore.match(/^[\t ]+/)?.[0] ?? '';

    result += `\n${indent}\${}`;
  }

  return result;
}

export function executeExtraActions(view: EditorView, tmAction: TMAction) {
  const extras = tmAction.e;
  if (!extras || extras.length === 0) return;

  if (extras.includes('C')) startAutocomplete(view);
}
