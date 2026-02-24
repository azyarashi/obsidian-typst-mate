import { Notice, Setting, type TextComponent, type ToggleComponent } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
import type ObsidianTypstMate from '@/main';

export function addEditorTab(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'Decoration' | 'Popup' | 'Action',
  setActiveTab: (tab: 'Decoration' | 'Popup' | 'Action') => void,
) {
  const subTabsEl = containerEl.createDiv('typstmate-processor-tabs');
  const subTabs: { id: 'Decoration' | 'Popup' | 'Action'; name: string }[] = [
    { id: 'Decoration', name: 'Decoration' },
    { id: 'Popup', name: 'Popup' },
    { id: 'Action', name: 'Action' },
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
    case 'Popup':
      addPopupSettings(plugin, containerEl);
      break;
    case 'Action':
      addActionSettings(plugin, containerEl);
      break;
  }
}

function addMathDecorationSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName('Conceal & Complement').setHeading();

  new Setting(containerEl)
    .setName('Conceal Math Symbols')
    .setDesc('Conceal math symbols (e.g. integral to ∫) in the editor.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.concealMathSymbols ?? DEFAULT_SETTINGS.concealMathSymbols);

      toggle.onChange((value) => {
        revealDelayToggle?.setDisabled(!value);
        revealDelayText?.setDisabled(!value || !(revealDelayToggle?.getValue() ?? false));

        plugin.settings.concealMathSymbols = value;
        plugin.saveSettings();
      });
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

      if (!revealDelayToggle?.getValue()) text.setDisabled(true);
    });

  new Setting(containerEl)
    .setName('Complement Symbol with Unicode')
    .setDesc('Automatically replaces typed symbols with Unicode equivalents.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.complementSymbolWithUnicode ?? DEFAULT_SETTINGS.complementSymbolWithUnicode);

      toggle.onChange((value) => {
        plugin.settings.complementSymbolWithUnicode = value;
        plugin.saveSettings();
      });
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

function addPopupSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName('Inline Preview').setHeading();

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
}

function addActionSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName('Tab Jump').setHeading();

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
    .setName('Jump Outside Bracket')
    .setDesc('Allow the cursor to jump outside the current bracket pair.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.jumpOutsideBracket ?? DEFAULT_SETTINGS.jumpOutsideBracket!);
      toggle.onChange((value) => {
        plugin.settings.jumpOutsideBracket = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Move to End of Math Block Before Exiting')
    .setDesc('When exiting math, first move the cursor to the end of the block.')
    .addToggle((toggle) => {
      toggle.setValue(
        plugin.settings.moveToEndOfMathBlockBeforeExiting ?? DEFAULT_SETTINGS.moveToEndOfMathBlockBeforeExiting!,
      );
      toggle.onChange((value) => {
        plugin.settings.moveToEndOfMathBlockBeforeExiting = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Prefer Inline Exit for Single Line Display Math')
    .setDesc('If a display math block fits on a single line, exit inline instead of creating a new line.')
    .addToggle((toggle) => {
      toggle.setValue(
        plugin.settings.preferInlineExitForSingleLineDisplayMath ??
          DEFAULT_SETTINGS.preferInlineExitForSingleLineDisplayMath!,
      );
      toggle.onChange((value) => {
        plugin.settings.preferInlineExitForSingleLineDisplayMath = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl).setName('Macro').setHeading();

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
