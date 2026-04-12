import type { EditorView } from '@codemirror/view';
import { Notice } from 'obsidian';

import { t } from '@/i18n';
import { appUtils } from '@/libs';
import type { Action } from '@/libs/action';

export function executeCommand(action: Action, view: EditorView, from: number, to: number) {
  const commandId = action.action.v;
  const command = appUtils.app.commands.findCommand(commandId);

  if (command !== undefined) {
    const isSuccess = appUtils.app.commands.executeCommand(command);
    if (!isSuccess) new Notice(t('notices.commandNotExecuted', { id: commandId }));
  } else new Notice(t('notices.commandNotFound', { id: commandId }));

  view.dispatch({
    changes: { from, to },
    userEvent: 'delete',
  });
}
