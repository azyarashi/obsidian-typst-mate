import { Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';

export function addEditorSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl).setName('Actions').setHeading();
  new Setting(containerEl).setName('Enable Shortcut Keys').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableShortcutKeys);
    toggle.onChange((value) => {
      plugin.settings.enableShortcutKeys = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Enable Tab Jump').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableTabJump);
    toggle.onChange((value) => {
      plugin.settings.enableTabJump = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Decorations').setHeading();
  new Setting(containerEl).setName('Enable Syntax Highlight').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableSyntaxHighlight);
    toggle.onChange((value) => {
      plugin.settings.enableSyntaxHighlight = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Enable Enclosing Bracket Pair Highlight').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableEnclosingBracketPairHighlight);
    toggle.onChange((value) => {
      plugin.settings.enableEnclosingBracketPairHighlight = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Enable Diagnostic').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableDiagnostic);
    toggle.onChange((value) => {
      plugin.settings.enableDiagnostic = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Suggests').setHeading();
  new Setting(containerEl).setName('Enable Snippets').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableSnippets);
    toggle.onChange((value) => {
      plugin.settings.enableSnippets = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Enable Autocomplete').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableAutocomplete);
    toggle.onChange((value) => {
      plugin.settings.enableAutocomplete = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Complement Symbol with Unicode').addToggle((toggle) => {
    if (!plugin.settings.enableAutocomplete) toggle.disabled = true;
    toggle.setValue(plugin.settings.complementSymbolWithUnicode);
    toggle.onChange((value) => {
      plugin.settings.complementSymbolWithUnicode = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Tooltips').setHeading();
  new Setting(containerEl).setName('Enable Inline Preview').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableInlinePreview);
    toggle.onChange((value) => {
      plugin.settings.enableInlinePreview = value;
      plugin.saveSettings();
    });
  });

  new Setting(containerEl).setName('Enable Diagnostic Tooltip').addToggle((toggle) => {
    toggle.setValue(plugin.settings.enableDiagnosticTooltip);
    toggle.onChange((value) => {
      plugin.settings.enableDiagnosticTooltip = value;
      plugin.saveSettings();
    });
  });
}
