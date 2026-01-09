import { Notice, Setting, type TextComponent, type ToggleComponent } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
import type ObsidianTypstMate from '@/main';

export function addEditorTab(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'Decoration' | 'Behavior',
  setActiveTab: (tab: 'Decoration' | 'Behavior') => void,
) {
  const subTabsEl = containerEl.createDiv('typstmate-processor-tabs');
  const subTabs: { id: 'Decoration' | 'Behavior'; name: string }[] = [
    { id: 'Decoration', name: 'Decoration' },
    { id: 'Behavior', name: 'Behavior' },
  ];

  for (const tab of subTabs) {
    const tabEl = subTabsEl.createDiv({
      cls: `typstmate-processor-tab ${activeTab === tab.id ? 'active' : ''}`,
      text: tab.name,
    });
    tabEl.addEventListener('click', () => {
      setActiveTab(tab.id);
    });
  }

  switch (activeTab) {
    case 'Decoration':
      addMathDecorationSettings(plugin, containerEl);
      break;
    case 'Behavior':
      addBehaviorSettings(plugin, containerEl);
      break;
  }
}

function addMathDecorationSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName('Conceal & Complement').setHeading();

  let concealToggle: ToggleComponent | null = null;
  new Setting(containerEl)
    .setName('Conceal Math Symbols')
    .setDesc(
      'Conceal math symbols (e.g. integral to ∫) in the editor. Requires Complement Symbol with Unicode to be disabled.',
    )
    .addToggle((toggle) => {
      concealToggle = toggle;
      toggle.setValue(plugin.settings.concealMathSymbols ?? DEFAULT_SETTINGS.concealMathSymbols);

      toggle.onChange((value) => {
        if (value) complementToggle?.setValue(false);
        revealDelayToggle?.setDisabled(!value);
        revealDelayText?.setDisabled(!value || !(revealDelayToggle?.getValue() ?? false));

        plugin.settings.concealMathSymbols = value;
        plugin.saveSettings();
      });

      // ここに setDisabled を追加するとデッドロックの恐れがある
    });

  let revealDelayToggle: ToggleComponent | null = null;
  new Setting(containerEl)
    .setName('Enable Math Symbol Reveal Delay')
    .setDesc('Enable delay before revealing concealed math symbols when cursor is nearby.')
    .addToggle((toggle) => {
      revealDelayToggle = toggle;
      toggle.setValue(
        plugin.settings.enableConcealMathSymbolRevealDelay ?? DEFAULT_SETTINGS.enableConcealMathSymbolRevealDelay,
      );

      toggle.onChange((value) => {
        revealDelayText?.setDisabled(!value);

        plugin.settings.enableConcealMathSymbolRevealDelay = value;
        plugin.saveSettings();
      });

      if (!concealToggle?.getValue()) toggle.setDisabled(true);
    });

  let revealDelayText: TextComponent | null = null;
  new Setting(containerEl)
    .setName('Conceal Math Symbol Reveal Delay Duration (ms)')
    .setDesc('Milliseconds to wait before revealing the symbol text.')
    .addText((text) => {
      revealDelayText = text;
      text.setValue(String(plugin.settings.mathSymbolRevealDelay ?? DEFAULT_SETTINGS.mathSymbolRevealDelay));

      text.onChange((value) => {
        const num = Number(value);
        if (Number.isNaN(num)) return new Notice('Invalid number for Reveal Delay');
        if (num <= 0) return new Notice('Reveal Delay must be greater than 0');

        plugin.settings.mathSymbolRevealDelay = num;
        plugin.saveSettings();
      });

      if (!concealToggle?.getValue() || !revealDelayToggle?.getValue()) text.setDisabled(true);
    });

  let complementToggle: ToggleComponent | null = null;
  new Setting(containerEl)
    .setName('Complement Symbol with Unicode')
    .setDesc('Automatically replaces typed symbols with Unicode equivalents.')
    .addToggle((toggle) => {
      complementToggle = toggle;
      toggle.setValue(plugin.settings.complementSymbolWithUnicode ?? DEFAULT_SETTINGS.complementSymbolWithUnicode);

      toggle.onChange((value) => {
        if (value) concealToggle?.setValue(false);
        // 他は concealToggle 側の onChange で制御

        plugin.settings.complementSymbolWithUnicode = value;
        plugin.saveSettings();
      });

      // ここに setDisabled を追加するとデッドロックの恐れがある
    });

  new Setting(containerEl).setName('Highlight').setHeading();

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

function addBehaviorSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
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
}
