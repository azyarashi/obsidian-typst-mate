import type { Command } from 'obsidian';
import { t } from '@/i18n';
import { typstManager } from '@/libs';

export const reloadTagFilesCommand: Command = {
  id: 'reload-tag-files',
  name: t('commands.reloadTagFiles'),
  editorCallback: async () => {
    const files = await typstManager.collectTagFiles();
    await typstManager.wasm.store({ files });

    typstManager.rerenderAll();
  },
};
