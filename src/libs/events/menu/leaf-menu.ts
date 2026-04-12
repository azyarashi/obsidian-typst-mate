import type { Menu, WorkspaceLeaf } from 'obsidian';
import { t } from '@/i18n';
import { isTypstFileView, TypstPreviewView } from '@/ui/views';

export function onLeafMenu(menu: Menu, leaf: WorkspaceLeaf) {
  const view = leaf.view;
  if (!isTypstFileView(view)) return console.log(10);

  menu.addItem((item) => {
    item.setTitle(t('contextMenu.openAsPreview')).onClick(async () => {
      await leaf.setViewState({
        type: TypstPreviewView.viewtype,
        state: { file: view.file },
      });
    });
  });
}
