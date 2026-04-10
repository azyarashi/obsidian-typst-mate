import type { Command } from 'obsidian';
import { t } from '@/i18n';
import { editorHelper } from '@/libs';

export const boxEquationCommand: Command = {
  id: 'box-equation',
  name: t('commands.boxCurrentEquation'),
  editorCallback: (editor) => editorHelper.boxCurrentEquation(editor.cm),
};
