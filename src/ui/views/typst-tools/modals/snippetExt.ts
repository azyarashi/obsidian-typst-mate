import { type App, Modal, Setting } from 'obsidian';

import { t } from '@/i18n';
import type ObsidianTypstMate from '@/main';
import type { SnippetView } from '../components/snippet';
import { CategoryNewModal } from './categoryNew';

export class SnippetExtModal extends Modal {
  constructor(app: App, plugin: ObsidianTypstMate, snippetIndex: number, snippetView: SnippetView) {
    super(app);

    const categories = plugin.settings.snippets?.map((snippet) => snippet.category) ?? [];

    // Category
    new Setting(this.contentEl).setName(t('snippets.ext.category')).addDropdown((dropdown) => {
      dropdown.addOptions(Object.fromEntries(categories.map((name) => [name, name])));
      dropdown.addOption('New', t('snippets.ext.newCategory'));
      dropdown.setValue(plugin.settings.snippets![snippetIndex]!.category);

      dropdown.onChange((value) => {
        if (value === 'New') {
          new CategoryNewModal(this.app, plugin, snippetIndex, snippetView).open();
          this.close();
          return;
        }
        plugin.settings.snippets![snippetIndex]!.category = value;
        plugin.saveSettings();
        snippetView.currentCategory = value;
        snippetView.dropdown.setValue(value);
        snippetView.buildSnippets();
        this.close();
      });
    });
  }
}
