import { Modal, Notice, Setting, type TFile, type TFolder } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import { createNewFile } from '@/utils/file';

export class TemplateSelectModal extends Modal {
  plugin: ObsidianTypstMate;

  target: TFile | TFolder;

  constructor(plugin: ObsidianTypstMate, target: TFile | TFolder) {
    super(plugin.app);
    this.plugin = plugin;
    this.target = target;
  }

  override async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const importPath = this.plugin.settings.importPath;
    if (!(await this.plugin.app.vault.adapter.exists(importPath))) {
      new Notice('Typst directory does not exist. Check the Advanced settings.');
      this.close();
      return;
    }

    const templatePath = `${importPath}/templates`;
    if (!(await this.plugin.app.vault.adapter.exists(templatePath))) {
      new Notice('Template directory does not exist. Please create a `templates` directory in the import path.');
      this.close();
      return;
    }

    const templates = this.plugin.app.vault
      .getFiles()
      .filter((file) => file.path.startsWith(templatePath) && file.extension === 'typ');

    new Setting(contentEl).setName('Select a template').setHeading();

    for (const template of templates) {
      new Setting(contentEl).setName(template.name).addButton((btn) => {
        btn.setButtonText('Select').onClick(async () => {
          const content = await this.plugin.app.vault.read(template);
          const file = await createNewFile(this.plugin.app.vault, this.target, content);
          if (file) this.plugin.app.workspace.openLinkText(file.path, '');
          this.close();
        });
      });
    }
  }
}
