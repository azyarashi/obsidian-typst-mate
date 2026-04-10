import type { Command } from 'obsidian';
import { t } from '@/i18n';
import { appUtils } from '@/libs';

export const openTypstToolsCommand: Command = {
  id: 'open-typst-tools',
  name: t('commands.openTypstTools'),
  callback: async () => {
    await appUtils.openTypstTools(true);
  },
};
