import { settingsManager } from '@/libs';
import type ObsidianTypstMate from '@/main';
import { consoleWarn } from '@/utils/notice';
import { TextFileView } from './text-file';
import { isTypstFileView, TypstFileView } from './typst-file';
import { TypstPreviewView } from './typst-preview';
import { type Tool, TypstToolsView } from './typst-tools';

export { isTypstFileView, TextFileView, type Tool, TypstFileView, TypstPreviewView, TypstToolsView };

export function registerViews(plugin: ObsidianTypstMate) {
  plugin.registerView(TextFileView.viewtype, (leaf) => new TextFileView(leaf));
  plugin.registerView(TypstFileView.viewtype, (leaf) => new TypstFileView(leaf));
  plugin.registerView(TypstPreviewView.viewtype, (leaf) => new TypstPreviewView(leaf));
  plugin.registerView(TypstToolsView.viewtype, (leaf) => new TypstToolsView(leaf));

  plugin.registerExtensions(['typ'], TypstFileView.viewtype);
  for (const extension of settingsManager.settings.textViewExtensions) {
    try {
      plugin.registerExtensions([extension], TextFileView.viewtype);
    } catch (e) {
      consoleWarn(`Failed to register extension '${extension}'`, e);
    }
  }
}
