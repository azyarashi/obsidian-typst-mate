import type { EditorView } from '@codemirror/view';
import { Notice } from 'obsidian';
import { t } from '@/i18n';
import { appUtils } from '@/libs';

export function executeCommand(commandId: string, view: EditorView, from: number, to: number) {
  const command = appUtils.app.commands.findCommand(commandId);

  if (command !== undefined) {
    const isSuccess = appUtils.app.commands.executeCommand(command);
    if (!isSuccess) new Notice(t('notices.commandNotExecuted', { id: commandId }));
  } else new Notice(t('notices.commandNotFound', { id: commandId }));

  if (from !== to) {
    view.dispatch({
      changes: { from, to },
      userEvent: 'delete',
    });
  }
}
