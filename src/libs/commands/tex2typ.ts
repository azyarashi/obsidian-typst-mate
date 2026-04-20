import { type Command, Notice } from 'obsidian';
import { t } from '@/i18n';
import { editorHelper } from '@/libs';

export const tex2typCommand: Command = {
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
