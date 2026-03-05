import { Setting } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
import { t, tFragment } from '@/i18n';
import type ObsidianTypstMate from '@/main';

import './renderer.css';

export function addRendererTab(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName(t('settings.renderer.enableBackgroundRendering'))
    .setDesc(t('settings.renderer.enableBackgroundRenderingDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableBackgroundRendering);
      toggle.onChange((value) => {
        plugin.settings.enableBackgroundRendering = value;
        plugin.saveSettings();
        plugin.reload(true);
      });
    });

  new Setting(containerEl)
    .setName(t('settings.renderer.patchPdfExport'))
    .setDesc(t('settings.renderer.patchPdfExportDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.patchPDFExport ?? DEFAULT_SETTINGS.patchPDFExport!);
      toggle.onChange((value) => {
        plugin.settings.patchPDFExport = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.renderer.useThemeTextColor'))
    .setDesc(t('settings.renderer.useThemeTextColorDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.autoBaseColor);
      toggle.onChange((value) => {
        plugin.settings.autoBaseColor = value;
        plugin.applyBaseColor();

        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.renderer.baseColor'))
    .setDesc(tFragment('settings.renderer.baseColorDesc'))
    .addColorPicker((colorPicker) => {
      colorPicker.setValue(plugin.settings.baseColor);
      colorPicker.onChange((value) => {
        plugin.settings.baseColor = value;
        plugin.applyBaseColor();
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.renderer.offset'))
    .setDesc(t('settings.renderer.offsetDesc'))
    .addSlider((slider) => {
      slider.setLimits(-0.5, 0.5, 0.05);
      slider.setValue(plugin.settings.offset);
      slider.setDynamicTooltip();

      slider.onChange(async (value) => {
        plugin.settings.offset = value;
        plugin.saveSettings();
        await plugin.typst.setOffset(plugin.settings.offset);
      });
    });

  new Setting(containerEl).setName(t('settings.renderer.fitNoteWidthProfiles')).setHeading();

  const profilesContainer = containerEl.createDiv();

  const renderProfiles = () => {
    const currentHeight = profilesContainer.clientHeight;
    if (currentHeight > 0) profilesContainer.style.minHeight = `${currentHeight}px`;

    profilesContainer.empty();

    new Setting(profilesContainer)
      .setName(t('settings.renderer.fitToNoteWidthProfile'))
      .setDesc(t('settings.renderer.fitToNoteWidthProfileDesc'))
      .addDropdown((dropdown) => {
        dropdown.addOption('Live', 'Live');
        for (const profile of plugin.settings.fitToNoteWidthProfiles) {
          dropdown.addOption(profile.name, profile.name);
        }
        dropdown.setValue(plugin.settings.fitToNoteWidthProfile).onChange(async (value) => {
          plugin.settings.fitToNoteWidthProfile = value;
          await plugin.saveSettings();
          plugin.typstManager?.updateNoteWidth();
        });
      });

    new Setting(profilesContainer)
      .setName(t('settings.renderer.profiles'))
      .setDesc(t('settings.renderer.profilesDesc'))
      .addButton((btn) =>
        btn.setButtonText(t('settings.renderer.addProfile')).onClick(async () => {
          plugin.settings.fitToNoteWidthProfiles.push({ name: t('settings.renderer.newProfileName'), width: '500pt' });
          await plugin.saveSettings();
          plugin.typstManager?.updateNoteWidth();
          renderProfiles();
        }),
      );

    plugin.settings.fitToNoteWidthProfiles.forEach((profile, index) => {
      new Setting(profilesContainer)
        .addText((text) => {
          text
            .setPlaceholder(t('settings.renderer.profileNamePlaceholder'))
            .setValue(profile.name)
            .onChange(async (value) => {
              const currentProfile = plugin.settings.fitToNoteWidthProfiles[index];
              if (!currentProfile) return;
              const oldName = currentProfile.name;
              currentProfile.name = value;
              if (plugin.settings.fitToNoteWidthProfile === oldName) plugin.settings.fitToNoteWidthProfile = value;
              await plugin.saveSettings();
              plugin.typstManager?.updateNoteWidth();
            });
        })
        .addText((text) => {
          text
            .setPlaceholder(t('settings.renderer.profileWidthPlaceholder'))
            .setValue(String(profile.width))
            .onChange(async (value) => {
              const currentProfile = plugin.settings.fitToNoteWidthProfiles[index];
              if (!currentProfile) return;
              currentProfile.width = value;
              await plugin.saveSettings();
              plugin.typstManager?.updateNoteWidth();
            });
        })
        .addExtraButton((btn) => {
          btn
            .setIcon('trash')
            .setTooltip(t('settings.renderer.deleteProfile'))
            .onClick(async () => {
              const currentProfile = plugin.settings.fitToNoteWidthProfiles[index];
              if (currentProfile) {
                plugin.settings.fitToNoteWidthProfiles.splice(index, 1);
                if (plugin.settings.fitToNoteWidthProfile === currentProfile.name)
                  plugin.settings.fitToNoteWidthProfile = 'Live';
                await plugin.saveSettings();
                plugin.typstManager?.updateNoteWidth();
                renderProfiles();
              }
            });
        });
    });

    requestAnimationFrame(() => {
      profilesContainer.style.minHeight = '';
    });
  };

  renderProfiles();
}
