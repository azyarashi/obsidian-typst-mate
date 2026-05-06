import { appUtils, settingsManager } from '@/libs';
import { t } from '@/libs/i18n';
import type { CommandGen } from '.';

export const toggleBackgroundRenderingCommand: CommandGen = () => {
  return {
    id: 'toggle-background-rendering',
    name: t('commands.toggleBackgroundRendering'),
    callback: toggleBackgroundRendering,
  };
};

export async function toggleBackgroundRendering() {
  settingsManager.settings.enableBackgroundRendering = !settingsManager.settings.enableBackgroundRendering;
  await settingsManager.saveSettings();

  // TODO: 単なる Wasm の初期化にとどめる
  await appUtils.reloadPlugin();
}
