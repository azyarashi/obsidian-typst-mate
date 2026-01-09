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
}
