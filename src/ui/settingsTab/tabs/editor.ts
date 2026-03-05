import { Notice, Setting, type TextComponent, type ToggleComponent } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
import { t } from '@/i18n';
import type ObsidianTypstMate from '@/main';

export function addEditorTab(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'Decoration' | 'Popup' | 'Action',
  setActiveTab: (tab: 'Decoration' | 'Popup' | 'Action') => void,
) {
  const subTabsEl = containerEl.createDiv('typstmate-processor-tabs');
  const subTabs: { id: 'Decoration' | 'Popup' | 'Action'; name: string }[] = [
    { id: 'Decoration', name: t('settings.editor.subTabs.decoration') },
    { id: 'Popup', name: t('settings.editor.subTabs.popup') },
    { id: 'Action', name: t('settings.editor.subTabs.action') },
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
  new Setting(containerEl).setName(t('settings.editor.concealAndComplement')).setHeading();

  new Setting(containerEl)
    .setName(t('settings.editor.concealMathSymbols'))
    .setDesc(t('settings.editor.concealMathSymbolsDesc'))
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
    .setName(t('settings.editor.enableRevealDelay'))
    .setDesc(t('settings.editor.enableRevealDelayDesc'))
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
    .setName(t('settings.editor.revealDelayDuration'))
    .setDesc(t('settings.editor.revealDelayDurationDesc'))
    .addText((text) => {
      revealDelayText = text;
      text.setValue(String(plugin.settings.mathSymbolRevealDelay ?? DEFAULT_SETTINGS.mathSymbolRevealDelay));

      text.onChange((value) => {
        const num = Number(value);
        if (Number.isNaN(num)) return new Notice(t('notices.invalidNumberRevealDelay'));
        if (num <= 0) return new Notice(t('notices.revealDelayMustBePositive'));

        plugin.settings.mathSymbolRevealDelay = num;
        plugin.saveSettings();
      });

      if (!revealDelayToggle?.getValue()) text.setDisabled(true);
    });

  new Setting(containerEl)
    .setName(t('settings.editor.complementSymbolWithUnicode'))
    .setDesc(t('settings.editor.complementSymbolWithUnicodeDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.complementSymbolWithUnicode ?? DEFAULT_SETTINGS.complementSymbolWithUnicode);

      toggle.onChange((value) => {
        plugin.settings.complementSymbolWithUnicode = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl).setName(t('settings.editor.highlight')).setHeading();

  new Setting(containerEl)
    .setName(t('settings.editor.disableBracketHighlight'))
    .setDesc(t('settings.editor.disableBracketHighlightDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.disableBracketHighlight ?? DEFAULT_SETTINGS.disableBracketHighlight!);
      toggle.onChange((value) => {
        plugin.settings.disableBracketHighlight = value;
        plugin.saveSettings();
        plugin.reload(true);
      });
    });

  new Setting(containerEl)
    .setName(t('settings.editor.useObsidianTheme'))
    .setDesc(t('settings.editor.useObsidianThemeDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.useObsidianTheme ?? DEFAULT_SETTINGS.useObsidianTheme!);
      toggle.onChange((value) => {
        plugin.settings.useObsidianTheme = value;
        plugin.saveSettings();
      });
    });
}

function addPopupSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName(t('settings.editor.inlinePreview')).setHeading();

  new Setting(containerEl)
    .setName(t('settings.editor.enableInlinePreview'))
    .setDesc(t('settings.editor.enableInlinePreviewDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableInlinePreview);
      toggle.onChange((value) => {
        plugin.settings.enableInlinePreview = value;
        plugin.saveSettings();
      });
    });
}

function addActionSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName(t('settings.editor.tabJump')).setHeading();

  new Setting(containerEl)
    .setName(t('settings.editor.revertTabToDefault'))
    .setDesc(t('settings.editor.revertTabToDefaultDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.revertTabToDefault ?? DEFAULT_SETTINGS.revertTabToDefault!);
      toggle.onChange((value) => {
        plugin.settings.revertTabToDefault = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.editor.jumpOutsideBracket'))
    .setDesc(t('settings.editor.jumpOutsideBracketDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.jumpOutsideBracket ?? DEFAULT_SETTINGS.jumpOutsideBracket!);
      toggle.onChange((value) => {
        plugin.settings.jumpOutsideBracket = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.editor.moveToEndOfMathBlock'))
    .setDesc(t('settings.editor.moveToEndOfMathBlockDesc'))
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
    .setName(t('settings.editor.preferInlineExit'))
    .setDesc(t('settings.editor.preferInlineExitDesc'))
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

  new Setting(containerEl).setName(t('settings.editor.macro')).setHeading();

  new Setting(containerEl)
    .setName(t('settings.editor.disableMacro'))
    .setDesc(t('settings.editor.disableMacroDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.disableMacro ?? DEFAULT_SETTINGS.disableMacro!);
      toggle.onChange((value) => {
        plugin.settings.disableMacro = value;
        plugin.saveSettings();
      });
    });
}
