import type { Command } from 'obsidian';
import { t } from '@/i18n';
import { appUtils, settingsManager } from '@/libs';

export const toggleBackgroundRenderingCommand: Command = {
  id: 'toggle-background-rendering',
  name: t('commands.toggleBackgroundRendering'),
  callback: async () => {
    settingsManager.settings.enableBackgroundRendering = !settingsManager.settings.enableBackgroundRendering;
    await settingsManager.saveSettings();
    await appUtils.reloadPlugin(false);
  },
};
