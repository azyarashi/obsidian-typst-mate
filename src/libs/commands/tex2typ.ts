import { Notice } from 'obsidian';
import { editorHelper } from '@/libs';
import { t } from '@/libs/i18n';
import type { CommandGen } from '.';

export const tex2typCommand: CommandGen = () => {
  return {
    id: 'tex2typ',
    name: t('commands.tex2typ'),
    editorCallback: async (editor) => {
      const view = editor.cm;
      if (!view) {
        new Notice(t('notices.noActiveView'));
        return;
      }

      await editorHelper.replaceTexWithTypst(editor, view);
    },
  };
};
