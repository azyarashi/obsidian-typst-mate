import { type App, Modal, Notice, Setting, type TFile, type TFolder } from 'obsidian';
import { t } from '@/i18n';
import { fileManager, settingsManager } from '@/libs';

export class TemplateSelectModal extends Modal {
  target: TFile | TFolder;

  constructor(app: App, target: TFile | TFolder) {
    super(app);
    this.target = target;
  }

  override async onOpen() {
    const { contentEl, app } = this;
    contentEl.empty();

    const resourcesPath = settingsManager.settings.resourcesPath;
    if (!(await app.vault.adapter.exists(resourcesPath))) {
      new Notice(t('notices.resourcesDirNotExist'));
      this.close();
      return;
    }

    const templatePath = `${resourcesPath}/templates`;
    if (!(await app.vault.adapter.exists(templatePath))) {
      new Notice(t('notices.templateDirNotExist'));
      this.close();
      return;
    }

    const templates = app.vault
      .getFiles()
      .filter((file) => file.path.startsWith(templatePath) && file.extension === 'typ');

    new Setting(contentEl).setName(t('modals.templateSelect.heading')).setHeading();

    for (const template of templates) {
      new Setting(contentEl).setName(template.name).addButton((btn) => {
        btn.setButtonText(t('modals.templateSelect.buttons.select')).onClick(async () => {
          const content = await app.vault.read(template);
          const tfile = await fileManager.createNewFile(this.target, content);
          if (tfile) app.workspace.getLeaf(false).openFile(tfile, { state: { openPreview: true } });
          this.close();
        });
      });
    }
  }
}
