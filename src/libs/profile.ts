import { MarkdownView } from 'obsidian';

import type ObsidianTypstMate from '@/main';

export interface WidthProfile {
  name: string;
  width: string;
}

export function getNoteWidth(plugin: ObsidianTypstMate): string {
  if (plugin.typstManager?.currentNoteWidth !== undefined) return plugin.typstManager.currentNoteWidth;

  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  let width = Infinity;

  if (view) {
    const sizer = view?.editor.editorComponent?.sizerEl;
    const sizerWidth = sizer?.clientWidth ? sizer.clientWidth : Infinity;

    const preview = view.previewMode;
    if (preview) {
      const divElP = view?.contentEl.find('div.el-p p');
      const pWidth = divElP?.clientWidth ? divElP.clientWidth : Infinity;

      width = Math.min(sizerWidth, pWidth);
    } else {
      const cmLine = sizer?.find('.cm-line');
      const cmContent = sizer?.find('.cm-content');

      const lineWidth = cmLine?.clientWidth ? cmLine.clientWidth : Infinity;
      const contentWidth = cmContent?.clientWidth ? cmContent?.clientWidth : Infinity;

      width = Math.min(sizerWidth, lineWidth, contentWidth);
    }
  } else {
    // キャンバス とか Kanban とか
  }

  const fileLineWidth = parseInt(getComputedStyle(document.body).getPropertyValue('--file-line-width'), 10);
  const typstWidth = ((width === Infinity ? (Number.isNaN(fileLineWidth) ? 700 : fileLineWidth) : width) / 4) * 3;

  return `${typstWidth}pt`;
}
