import { type App, Modal, Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import type { SnippetView } from '../components/snippet';

export class CategoryNewModal extends Modal {
  snippetView: SnippetView;
  category: string;

  constructor(app: App, plugin: ObsidianTypstMate, snippetIndex: number, snippetView: SnippetView) {
    super(app);
    this.snippetView = snippetView;
    this.category = plugin.settings.snippets![snippetIndex]!.category;

    new Setting(this.contentEl).setName(`New Category`).addText((text) => {
      text.setValue(this.category);

      text.onChange((value) => {
        this.category = value;
        plugin.settings.snippets![snippetIndex]!.category = value;
        plugin.saveSettings();
      });
    });
  }

  override onClose() {
    this.snippetView.currentCategory = this.category;
    this.snippetView.menuEl.empty();
    this.snippetView.buildMenu();
    this.snippetView.buildSnippets();
    this.snippetView.dropdown.setValue(this.category);
  }
}
