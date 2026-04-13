import { Menu } from 'obsidian';
import { TypstMate } from '@/api';
import { t } from '@/i18n';
import { appUtils, settingsManager, typstManager } from '@/libs';

export function showStatusBarMenu(event: MouseEvent) {
  const menu = new Menu();

  menu.addItem((item) => {
    item.setTitle(t('commands.openTypstTools')).onClick(() => appUtils.openTypstTools(true));
  });

  menu.addItem((item) => {
    const enabled = settingsManager.settings.enableBackgroundRendering;
    item.setTitle(t('commands.toggleBackgroundRendering')).onClick(async () => {
      settingsManager.settings.enableBackgroundRendering = !enabled;
      await settingsManager.saveSettings();
      await appUtils.reloadPlugin(false);
    });
  });

  menu.addItem((item) => {
    item.setTitle(t('settings.renderer.fitToNoteWidthProfile'));

    const currentProfile = settingsManager.settings.fitToNoteWidthProfile;
    const submenu = item.setSubmenu();

    submenu.addItem((subItem) => {
      subItem
        .setTitle('Live')
        .setDisabled(currentProfile === 'Live')
        .onClick(async () => {
          settingsManager.settings.fitToNoteWidthProfile = 'Live';
          await settingsManager.saveSettings();
          await appUtils.reloadPlugin(false);
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
            await appUtils.reloadPlugin(false);
          });
      });
    }
  });

  menu.addSeparator();

  menu.addItem((item) => {
    item.setTitle(t('commands.refreshView')).onClick(() => appUtils.refreshView());
  });

  menu.addItem((item) => {
    item.setTitle(t('commands.refreshWasm')).onClick(async () => {
      await typstManager.refreshWasm();
      appUtils.refreshView();
    });
  });

  menu.addSeparator();

  menu.addItem((item) => {
    item.setTitle(`Typst Mate v${TypstMate.version} on Typst v${TypstMate.typstVersion}`).setDisabled(true);
  });

  menu.showAtMouseEvent(event);
}
