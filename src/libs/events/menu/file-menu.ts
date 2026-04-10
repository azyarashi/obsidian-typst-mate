import { type Menu, type TAbstractFile, TFolder } from 'obsidian';
import { t } from '@/i18n';
import { appUtils, fileManager } from '@/libs';
import { TemplateSelectModal } from '@/ui/modals/templateSelect';

export function onFileMenu(menu: Menu, file: TAbstractFile) {
  if (!(file instanceof TFolder)) return;
  const { app } = appUtils;

  menu.addItem((item) => {
    item.setTitle(t('contextMenu.newTypstFile')).onClick(async () => {
      const tfile = await fileManager.createNewFile(file);
      if (tfile) app.workspace.getLeaf(true).openFile(tfile);
    });
    menu.addItem((item) => {
      item.setTitle(t('contextMenu.newTypstFileWithTemplate')).onClick(() => {
        new TemplateSelectModal(app, file).open();
      });
    });
  });
}
