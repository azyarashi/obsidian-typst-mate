import { rendererManager } from '@/libs';
import { t } from '@/libs/i18n';
import type { CommandGen } from '.';

export const reloadTagFilesCommand: CommandGen = () => {
  return {
    id: 'reload-tag-files',
    name: t('commands.reloadTagFiles'),
    editorCallback: async () => {
      const files = await rendererManager.collectTagFiles();
      await rendererManager.wasm.store({ files });

      rendererManager.rerenderAll();
    },
  };
};
