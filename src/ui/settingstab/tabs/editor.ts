import { Notice, Setting, type ToggleComponent } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
import type ObsidianTypstMate from '@/main';

export function addEditorTab(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName('Math Decoration').setHeading();

  let concealToggle: ToggleComponent | null = null;
  let complementToggle: ToggleComponent | null = null;

  new Setting(containerEl)
    .setName('Conceal Math Symbols')
    .setDesc('Conceal math symbols (e.g. integral to ∫) in the editor.')
    .addToggle((toggle) => {
      concealToggle = toggle;
      toggle.setValue(plugin.settings.concealMathSymbols ?? DEFAULT_SETTINGS.concealMathSymbols!);
      toggle.onChange((value) => {
        plugin.settings.concealMathSymbols = value;
        if (value && complementToggle) {
          complementToggle.setValue(false);
          plugin.settings.complementSymbolWithUnicode = false;
        }
        plugin.saveSettings();
        plugin.reload(true);
      });
    });

  new Setting(containerEl)
    .setName('Enable Math Symbol Reveal Delay')
    .setDesc('Enable delay before revealing concealed math symbols when cursor is nearby.')
    .addToggle((toggle) => {
      toggle.setValue(
        plugin.settings.enableConcealMathSymbolRevealDelay ?? DEFAULT_SETTINGS.enableConcealMathSymbolRevealDelay!,
      );
      toggle.onChange((value) => {
        plugin.settings.enableConcealMathSymbolRevealDelay = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Conceal Math Symbol Reveal Delay')
    .setDesc('Milliseconds to wait before revealing the symbol text.')
    .addText((text) => {
      text.setValue(String(plugin.settings.mathSymbolRevealDelay ?? DEFAULT_SETTINGS.mathSymbolRevealDelay!));
      text.onChange((value) => {
        const num = Number(value);
        if (Number.isNaN(num)) {
          new Notice('Invalid number for Reveal Delay');
          return;
        }
        plugin.settings.mathSymbolRevealDelay = num;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Complement Symbol with Unicode')
    .setDesc('Automatically replaces typed symbols with Unicode equivalents.')
    .addToggle((toggle) => {
      complementToggle = toggle;
      toggle.setValue(plugin.settings.complementSymbolWithUnicode ?? DEFAULT_SETTINGS.complementSymbolWithUnicode!);
      toggle.onChange((value) => {
        plugin.settings.complementSymbolWithUnicode = value;
        if (value && concealToggle) {
          concealToggle.setValue(false);
          plugin.settings.concealMathSymbols = false;
          plugin.reload(true);
        }
        plugin.saveSettings();
      });
    });

  new Setting(containerEl).setName('Behavior').setHeading();

  new Setting(containerEl)
    .setName('Enable Inline Preview')
    .setDesc('Show live preview for inline math.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableInlinePreview);
      toggle.onChange((value) => {
        plugin.settings.enableInlinePreview = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Revert Tab to Default')
    .setDesc('Reverts the Tab key behavior to the default indentation instead of jumping to the next placeholder.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.revertTabToDefault ?? DEFAULT_SETTINGS.revertTabToDefault!);
      toggle.onChange((value) => {
        plugin.settings.revertTabToDefault = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Disable Macro')
    .setDesc('Disable default macros like mk and dm.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.disableMacro ?? DEFAULT_SETTINGS.disableMacro!);
      toggle.onChange((value) => {
        plugin.settings.disableMacro = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Disable Bracket Highlight')
    .setDesc('Disable highlighting of matching brackets.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.disableBracketHighlight ?? DEFAULT_SETTINGS.disableBracketHighlight!);
      toggle.onChange((value) => {
        plugin.settings.disableBracketHighlight = value;
        plugin.saveSettings();
        plugin.reload(true);
      });
    });
}
