import type { EditorView } from '@codemirror/view';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { t } from '@/i18n';
import type { CommandGen } from '..';

export const boxEquationCommand: CommandGen = () => {
  return {
    id: 'box-equation',
    name: t('commands.boxEquation'),
    editorCallback: (editor) => boxCurrentEquation(editor.cm),
  };
};

function boxCurrentEquation(view: EditorView) {
  const region = getActiveRegion(view);
  if (!region) return new Notice(t('notices.noActiveRegion'));

  const innerFrom = region.from + region.skip;
  const content = view.state.sliceDoc(innerFrom, region.to);
  const newContent = `${region.kind === 'display' ? ' ' : ''}boxed(${content})`;

  view.dispatch({
    changes: { from: innerFrom, to: region.to, insert: newContent },
    selection: { anchor: innerFrom + newContent.length },
  });
}
