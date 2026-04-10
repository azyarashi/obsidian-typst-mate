import type { Command } from 'obsidian';
import { t } from '@/i18n';
import { editorHelper } from '@/libs';

export const selectEquationCommand: Command = {
  id: 'select-equation',
  name: t('commands.selectCurrentEquation'),
  editorCallback: (editor) => editorHelper.selectCurrentEquation(editor.cm),
};
