import { Menu } from 'obsidian';
import { TypstMate } from '@/api';
import { t } from '@/i18n';
import { appUtils, settingsManager } from '@/libs';

export function showStatusBarMenu(event: MouseEvent) {
  const menu = new Menu();

  menu.addItem((item) => {
    item
      .setTitle(t('commands.openTypstTools'))
      .setIcon('layout-side-panel')
      .onClick(() => appUtils.openTypstTools(true));
  });

  menu.addItem((item) => {
    const enabled = settingsManager.settings.enableBackgroundRendering;
    item
      .setTitle(t('commands.toggleBackgroundRendering'))
      .setIcon(enabled ? 'check' : 'none')
      .onClick(async () => {
        settingsManager.settings.enableBackgroundRendering = !enabled;
        await settingsManager.saveSettings();
        await appUtils.reloadPlugin(false);
      });
  });

  menu.addItem((item) => {
    item.setTitle(t('settings.renderer.fitToNoteWidthProfile')).setIcon('expand-vertically');

    const currentProfile = settingsManager.settings.fitToNoteWidthProfile;
    const submenu = item.setSubmenu();

    submenu.addItem((subItem) => {
      subItem
        .setTitle('Live')
        .setIcon(currentProfile === 'Live' ? 'check' : 'none')
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
          .setIcon(currentProfile === profile.name ? 'check' : 'none')
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
    item
      .setTitle(`Typst Mate v${TypstMate.version} on Typst ${TypstMate.typstVersion}`)
      .setIcon('info')
      .setDisabled(true);
  });

  menu.showAtMouseEvent(event);
}
