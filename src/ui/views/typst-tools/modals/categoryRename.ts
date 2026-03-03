import { type App, Modal, Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import type { SnippetView } from '../components/snippet';

export class CategoryRenameModal extends Modal {
  snippetView: SnippetView;
  oldCategory: string;
  newCategory?: string;
  plugin: ObsidianTypstMate;

  constructor(app: App, plugin: ObsidianTypstMate, oldCategory: string, snippetView: SnippetView) {
    super(app);
    this.snippetView = snippetView;
    this.oldCategory = oldCategory;
    this.plugin = plugin;

    new Setting(this.contentEl).setName(`Rename Category`).addText((text) => {
      text.setValue(oldCategory);

      text.onChange((value) => {
        this.newCategory = value;
      });
    });
  }

  override onClose() {
    if (!this.newCategory) return;

    this.plugin.settings.snippets?.forEach((snippet) => {
      if (snippet.category === this.oldCategory) {
        snippet.category = this.newCategory!;
      }
    });

    this.plugin.saveSettings();
    this.snippetView.menuEl.empty();
    this.snippetView.dropdown.setValue(this.newCategory);
    this.snippetView.currentCategory = this.newCategory;
    this.snippetView.buildMenu();
    this.snippetView.buildSnippets();
  }
}
