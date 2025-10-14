import { debounce, Platform, Setting } from 'obsidian';
import { FontList } from '@/core/settings/components/font';
import { PackagesList } from '@/core/settings/components/package';
import { ProcessorList } from '@/core/settings/components/processor';
import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

export function addOtherSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName('Skip Preparation Waiting')
    .setDesc(
      "This feature is unstable on mobile! Defers initialization of font and package loading and processor compilation at plugin startup, which greatly reduces Obsidian's startup time. However, the time until the first rendering does not change; the original text will be shown until then.",
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.skipPreparationWaiting);
      toggle.onChange((value) => {
        plugin.settings.skipPreparationWaiting = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Disable Package Cache')
    .setDesc(
      'Enable this if crashes occur on mobile apps with low RAM. However, packages will need to be installed every time. On desktop apps, startup time will be reduced. If you use a lot of packages, you may want to enable this.',
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.disablePackageCache);
      toggle.onChange((value) => {
        plugin.settings.disablePackageCache = value;
        plugin.saveSettings();
      });
    });

  // Font settings
  const fontSetting = new Setting(containerEl).setName('Font').setHeading();

  if (Platform.isDesktopApp) {
    fontSetting.addButton((button) => {
      button.setIcon('folder-open');

      button.setTooltip('Open Fonts Directory');
      button.onClick(() => {
        window.open(`file://${plugin.app.vault.adapter.basePath}/${plugin.fontsDirNPath}`);
      });
    });
  }

  // フォント一覧
  new FontList(plugin, containerEl);

  // Package settings
  new Setting(containerEl)
    .setName('Package')
    .setDesc(
      'When a package is imported, the cache is used instead of the actual files for faster performance. If you make changes directly, please click the package icon to refresh the cache(plugin reload is required.)',
    )
    .setHeading();

  // パッケージ一覧
  new PackagesList(plugin, containerEl);

  // Processor settings
  new Setting(containerEl)
    .setName('Processor')
    .setDesc(
      new CustomFragment()
        .appendText(
          'In each mode, the first matching Processor ID from the top will be used. An empty Processor ID means the default and should be placed at the bottom. In the format, ',
        )
        .appendCodeText('{CODE}')
        .appendText(' can be used (only the first occurrence is replaced), and ')
        .appendCodeText('fontsize')
        .appendText(
          ' can be used as an internal length value. In inline mode, separate the id and the code with a colon ',
        )
        .appendCodeText(':')
        .appendText(
          ' in the format. When adding or removing processors for codeblock mode, reload the plugin to apply changes. ',
        )
        .appendBoldText('IDs should not contain any special characters!')
        .appendText(' For more details, see ')
        .appendLinkText('Processor.md', 'https://github.com/azyarashi/obsidian-typst-mate/blob/main/Processor.md')
        .appendText('.'),
    )
    .setHeading();

  new Setting(containerEl).setName('Preamble').setDesc('Preamble can be turned on or off by toggling each processor.');
  const preambleTextEl = containerEl.createEl('textarea');
  preambleTextEl.addClass('typstmate-form-control');
  preambleTextEl.addClass('typstmate-preamble');
  preambleTextEl.value = plugin.settings.preamble;
  preambleTextEl.placeholder = 'preamble';

  preambleTextEl.addEventListener(
    'input',
    debounce(
      () => {
        plugin.settings.preamble = preambleTextEl.value;

        plugin.saveSettings();
      },
      500,
      true,
    ),
  );

  new ProcessorList(plugin, 'inline', containerEl, 'Inline($...$) Processors');
  new ProcessorList(plugin, 'display', containerEl, 'Display($$...$$) Processors');
  new ProcessorList(plugin, 'codeblock', containerEl, 'CodeBlock(```...```) Processors');
  if (plugin.excalidrawPluginInstalled) {
    new ProcessorList(plugin, 'excalidraw', containerEl, 'Excalidraw Processors');
  }
}
