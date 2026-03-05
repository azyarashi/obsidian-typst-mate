import { debounce, Notice, Setting } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
import { t, tFragment } from '@/i18n';
import type ObsidianTypstMate from '@/main';

export function addAdvancedTab(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  const setting = new Setting(containerEl)
    .setName(t('settings.advanced.importPath'))
    .setDesc(t('settings.advanced.importPathDesc'))
    .addText((text) => {
      text.setValue(String(plugin.settings.importPath ?? DEFAULT_SETTINGS.importPath));

      const update = debounce(
        async () => {
          const files = await plugin.typstManager.collectTagFiles();
          await plugin.typst.store({ files });
          new Notice(t('notices.filesUpdated'));

          plugin.typstManager.refreshView();
        },
        500,
        true,
      );

      text.onChange(async (path) => {
        plugin.settings.importPath = path;
        plugin.saveSettings();
        update();
      });
    });
  setting.infoEl.createEl('a', {
    text: t('settings.advanced.openDetails'),
    href: 'https://github.com/azyarashi/obsidian-typst-mate/releases/tag/2.2.28',
  });

  new Setting(containerEl).setName(t('settings.advanced.enableDebugger')).addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableDebugger);
    toggle.onChange((value) => {
      plugin.settings.enableDebugger = value;
      plugin.saveSettings();

      if (value) (document.querySelector('.typstmate-debug-panel') as HTMLElement).show();
      else (document.querySelector('.typstmate-debug-panel') as HTMLElement).hide();
    });
  });

  new Setting(containerEl)
    .setName(t('settings.advanced.openTypstToolsOnStartup'))
    .setDesc(t('settings.advanced.openTypstToolsOnStartupDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.openTypstToolsOnStartup);
      toggle.onChange((value) => {
        plugin.settings.openTypstToolsOnStartup = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.advanced.enableMathjaxFallback'))
    .setDesc(tFragment('settings.advanced.enableMathjaxFallbackDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableMathjaxFallback);
      toggle.onChange((value) => {
        plugin.settings.enableMathjaxFallback = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl).setName(t('settings.advanced.applyProcessorToMathJax')).addToggle((toggle) => {
    toggle.setValue(plugin.settings.applyProcessorToMathJax);
    toggle.onChange((value) => {
      plugin.settings.applyProcessorToMathJax = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName(t('settings.advanced.reloadPlugin')).addButton((button) => {
    button.setButtonText(t('settings.advanced.buttons.reloadPlugin'));
    button.onClick(async () => {
      await plugin.reload(true);
      new Notice(t('notices.pluginReloaded'));
    });
  });

  const div = containerEl.createDiv();
  div.textContent = t('settings.advanced.snippetsManaged');
  const a = div.createEl('a', { text: t('settings.advanced.openSnippetManager') });
  a.href = '#';
  a.style.cursor = 'pointer';
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    await plugin.activateLeaf(true, 'snippets');
    plugin.app.setting.close();
  });
}
