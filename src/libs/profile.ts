import { MarkdownView } from 'obsidian';

import type ObsidianTypstMate from '@/main';

export interface WidthProfile {
  name: string;
  width: string;
}

export function getNoteWidth(plugin: ObsidianTypstMate): string {
  if (plugin.typstManager?.currentNoteWidth !== undefined) return plugin.typstManager.currentNoteWidth;

  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  const divElP = view?.contentEl.find('div.el-p p');
  const cmLine = view?.editor.editorComponent?.sizerEl.find('.cm-line');
  const cmContent = view?.editor.editorComponent?.sizerEl.find('.cm-content');

  const pWidth = divElP?.clientWidth ? divElP.clientWidth : Infinity;
  const lineWidth = cmLine?.clientWidth ? cmLine.clientWidth : Infinity;
  const contentWidth = cmContent?.clientWidth ? cmContent?.clientWidth : Infinity;
  const fileLineWidth = parseInt(getComputedStyle(document.body).getPropertyValue('--file-line-width'), 10);

  const width = Math.min(pWidth, lineWidth, contentWidth, Number.isNaN(fileLineWidth) ? Infinity : fileLineWidth);
  const typstWidth = ((width === Infinity ? 700 : width) / 4) * 3;

  return `${typstWidth}pt`;
}
