import { t } from '@/i18n';
import { typstManager } from '@/libs';
import type { CommandGen } from '.';

export const reloadTagFilesCommand: CommandGen = () => {
  return {
    id: 'reload-tag-files',
    name: t('commands.reloadTagFiles'),
    editorCallback: async () => {
      const files = await typstManager.collectTagFiles();
      await typstManager.wasm.store({ files });

      typstManager.rerenderAll();
    },
  };
};
