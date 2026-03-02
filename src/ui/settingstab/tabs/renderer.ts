import { Setting } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/data/settings';
import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

import './renderer.css';

export function addRendererTab(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName('Enable Background Rendering')
    .setDesc(
      new CustomFragment()
        .appendText('The UI will no longer freeze, but ')
        .appendText('it may conflict with plugins related to export or rendering.')
        .appendText(' (Disabled automatically when exporting to PDF via Markdown menu)'),
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableBackgroundRendering);
      toggle.onChange((value) => {
        plugin.settings.enableBackgroundRendering = value;
        plugin.saveSettings();
        plugin.reload(true);
      });
    });

  new Setting(containerEl)
    .setName('Patch PDF Export')
    .setDesc(
      'Temporarily disable AutoBaseColor and use BaseColor during PDF Export to fix white background issues in dark themes.',
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.patchPDFExport ?? DEFAULT_SETTINGS.patchPDFExport!);
      toggle.onChange((value) => {
        plugin.settings.patchPDFExport = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Use Theme Text Color')
    .setDesc("Uses Obsidian's text color as the base color automatically.")
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.autoBaseColor);
      toggle.onChange((value) => {
        plugin.settings.autoBaseColor = value;
        plugin.applyBaseColor();

        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Base Color')
    .setDesc(
      new CustomFragment()
        .appendText('Replace black in SVGs with another color. Useful for dark themes. Disable ')
        .appendCodeText('Use Theme Text Color')
        .appendText(' to use this.'),
    )
    .addColorPicker((colorPicker) => {
      colorPicker.setValue(plugin.settings.baseColor);
      colorPicker.onChange((value) => {
        plugin.settings.baseColor = value;
        plugin.applyBaseColor();
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Offset')
    .setDesc(
      'Offset for inline math. The appearance may look unappealing depending on the font used in Obsidian. Please adjust it here if necessary.',
    )
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

  new Setting(containerEl).setName('Fit Note Width Profiles').setHeading();

  const profilesContainer = containerEl.createDiv();

  const renderProfiles = () => {
    const currentHeight = profilesContainer.clientHeight;
    if (currentHeight > 0) profilesContainer.style.minHeight = `${currentHeight}px`;

    profilesContainer.empty();

    new Setting(profilesContainer)
      .setName('Fit To Note Width Profile')
      .setDesc('Profile to use when calculating "fit to note width". Select a preset or Live to detect editor width.')
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
      .setName('Profiles')
      .setDesc('Add or remove custom width profiles.')
      .addButton((btn) =>
        btn.setButtonText('Add Profile').onClick(async () => {
          plugin.settings.fitToNoteWidthProfiles.push({ name: 'New Profile', width: '500pt' });
          await plugin.saveSettings();
          plugin.typstManager?.updateNoteWidth();
          renderProfiles();
        }),
      );

    plugin.settings.fitToNoteWidthProfiles.forEach((profile, index) => {
      new Setting(profilesContainer)
        .addText((text) => {
          text
            .setPlaceholder('Name')
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
            .setPlaceholder('Width')
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
            .setTooltip('Delete Profile')
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
