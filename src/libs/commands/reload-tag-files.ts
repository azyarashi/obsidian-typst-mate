import { $, metadataManager, renderManager } from '@/libs';
import { t } from '@/libs/i18n';
import type { CommandGen } from '.';

export const reloadTagFilesCommand: CommandGen = () => {
  return {
    id: 'reload-tag-files',
    name: t('commands.reloadTagFiles'),
    editorCallback: async () => {
      const files = await metadataManager.collectTagFiles();
      if ($.wasm) await $.wasm.store({ files });

      renderManager.rerenderAll();
    },
  };
};
