import type { EditorView } from '@codemirror/view';
import { getActiveRegion } from '@/editor';
import { t } from '@/i18n';
import type { CommandGen } from '..';

export const selectEquationCommand: CommandGen = () => {
  return {
    id: 'select-equation',
    name: t('commands.selectEquation'),
    editorCallback: (editor) => selectCurrentEquation(editor.cm),
  };
};

function selectCurrentEquation(view: EditorView) {
  const region = getActiveRegion(view);
  if (!region) return new Notice(t('notices.noActiveRegion'));

  view.dispatch({
    selection: { anchor: region.from + region.skip, head: region.to },
  });
}
