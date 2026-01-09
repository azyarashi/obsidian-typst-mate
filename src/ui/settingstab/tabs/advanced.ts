import { Notice, Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

export function addAdvancedTab(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName('Open Typst Tools on Startup')
    .setDesc('Open Typst tools in side panel when launching Obsidian.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.openTypstToolsOnStartup);
      toggle.onChange((value) => {
        plugin.settings.openTypstToolsOnStartup = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Enable MathJax Fallback')
    .setDesc(
      new CustomFragment()
        .appendText('Not recommended for performance reasons. When enabled, ')
        .appendBoldText('Typst errors, warnings, and hints will be unavailable.'),
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableMathjaxFallback);
      toggle.onChange((value) => {
        plugin.settings.enableMathjaxFallback = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl).setName('Reload Plugin').addButton((button) => {
    button.setButtonText('Reload Plugin');
    button.onClick(async () => {
      await plugin.reload(true);
      new Notice('Plugin reloaded.');
    });
  });

  const div = containerEl.createDiv();
  div.textContent = 'Snippets are managed in a separate leaf. ';
  const a = div.createEl('a', { text: 'Open Snippet Manager' });
  a.href = '#';
  a.style.cursor = 'pointer';
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    await plugin.activateLeaf(true, 'snippets');
    plugin.app.setting.close();
  });
}
