import { Menu } from 'obsidian';
import { TypstMate } from '@/api';
import { appUtils, rendererManager, settingsManager } from '@/libs';
import { toggleBackgroundRendering } from '@/libs/commands/toggle-background-rendering';
import { t } from '@/libs/i18n';

export function showStatusBarMenu(event: MouseEvent) {
  const menu = new Menu();

  menu.addItem((item) => {
    item.setTitle(t('common.openTypstTools')).onClick(() => appUtils.openTypstTools(true));
  });

  menu.addItem((item) => {
    item.setTitle(t('statusBar.toggleBackgroundRendering')).onClick(toggleBackgroundRendering);
  });

  menu.addItem((item) => {
    item.setTitle(t('settings.renderer.fitToNoteWidthProfileName'));

    const currentProfile = settingsManager.settings.fitToNoteWidthProfile;
    const submenu = item.setSubmenu();

    submenu.addItem((subItem) => {
      subItem
        .setTitle('Live')
        .setDisabled(currentProfile === 'Live')
        .onClick(async () => {
          settingsManager.settings.fitToNoteWidthProfile = 'Live';
          await settingsManager.saveSettings();
          await rendererManager.rerenderAll();
        });
    });

    const profiles = settingsManager.settings.fitToNoteWidthProfiles;
    for (const profile of profiles) {
      submenu.addItem((subItem) => {
        subItem
          .setTitle(profile.name)
          .setDisabled(currentProfile === profile.name)
          .onClick(async () => {
            settingsManager.settings.fitToNoteWidthProfile = profile.name;
            await settingsManager.saveSettings();
            await rendererManager.rerenderAll();
          });
      });
    }
  });

  menu.addSeparator();

  menu.addItem((item) => {
    item.setTitle(t('statusBar.refreshViews')).onClick(() => appUtils.refreshView());
  });

  menu.addItem((item) => {
    item.setTitle(t('statusBar.refreshWasmRuntime')).onClick(async () => {
      await rendererManager.refreshWasm();
      appUtils.refreshView();
    });
  });

  menu.addSeparator();

  menu.addItem((item) => {
    item.setTitle(`Typst Mate v${TypstMate.pluginVersion} on Typst v${TypstMate.typstVersion}`).setDisabled(true);
  });

  menu.showAtMouseEvent(event);
}
