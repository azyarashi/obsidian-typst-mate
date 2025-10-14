import { Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

export function addRenderingSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName('Enable Background Rendering')
    .setDesc(
      new CustomFragment()
        .appendText('The UI will no longer freeze, but ')
        .appendText('it may conflict with plugins related to export or rendering')
        .appendText('.'),
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
    .setName('Use Theme Text Color')
    .setDesc("Uses Obsidian's text color as the base color automatically.")
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.autoBaseColor);
      toggle.onChange((value) => {
        plugin.settings.autoBaseColor = value;
        if (value) plugin.applyBaseColor();

        plugin.saveSettings();
      });
    });

  new Setting(containerEl).setName('Fail on Warning').addToggle((toggle) => {
    toggle.setValue(plugin.settings.failOnWarning);
    toggle.onChange((value) => {
      plugin.settings.failOnWarning = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl)
    .setName('Base Color')
    .setDesc(
      new CustomFragment()
        .appendText(
          'Replace black in SVGs with another color. This is useful when using a dark theme. To enable this, you need to disable the ',
        )
        .appendCodeText('Use Theme Text Color')
        .appendText(' setting.'),
    )
    .addColorPicker((colorPicker) => {
      colorPicker.setValue(plugin.settings.baseColor);
      colorPicker.onChange((value) => {
        plugin.settings.baseColor = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Enable MathJax Fallback')
    .setDesc(
      new CustomFragment()
        .appendText('Not recommended for performance reasons. When enabled, ')
        .appendBoldText('Typst errors, warnings, and hints will be unavailable.')
        .appendText(''),
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableMathjaxFallback);
      toggle.onChange((value) => {
        plugin.settings.enableMathjaxFallback = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Patch PDF Export')
    .setDesc(
      'When performing PDF Export, temporarily disable AutoBaseColor and use BaseColor. This option exists because when performing PDF Export with a dark theme, it often outputs with a white background.',
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.patchPDFExport);
      toggle.onChange((value) => {
        plugin.settings.patchPDFExport = value;
        plugin.saveSettings();
      });
    });
}
