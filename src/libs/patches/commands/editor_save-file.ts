import type { Command } from 'obsidian';
import { formatterSettingsFacet } from '@/editor';
import { appUtils } from '@/libs/appUtils';
import { formatTypstInView } from '@/libs/commands/format-typst';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';

class EditorSaveFilePatch implements Singleton {
  private editorSaveFile: Command | undefined;
  private editorSaveFileCallbackOrig: Command['checkCallback'];

  init(plugin: ObsidianTypstMate) {
    this.editorSaveFile = plugin.app.commands.commands['editor:save-file']!;
    this.editorSaveFileCallbackOrig = this.editorSaveFile.checkCallback!;
  }

  apply() {
    const editorSaveFileCallbackOrig = this.editorSaveFileCallbackOrig;
    this.editorSaveFile!.checkCallback = function (this, checking: boolean) {
      if (!checking) {
        const view = appUtils.getActiveMarkdownView();
        const cm = view?.editor.cm;
        if (cm?.state.facet(formatterSettingsFacet).formatOnSave) formatTypstInView(cm);
      }
      return editorSaveFileCallbackOrig!.apply(this, [checking]);
    };
  }

  detach() {
    this.editorSaveFile!.checkCallback = this.editorSaveFileCallbackOrig;
  }
}

export const editorSaveFilePatch = new EditorSaveFilePatch();
