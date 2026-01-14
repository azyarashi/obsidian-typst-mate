import { EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';
import type ObsidianTypstMate from '@/main';

const createDocChangePlugin = (plugin: ObsidianTypstMate) => {
  return ViewPlugin.define((_view) => {
    return {
      update(_update) {
        // No-op for now as editorHelper architecture changed.
      },
    };
  });
};
export class TypstTextView extends TextFileView {
  static viewtype = 'typst-text';
  plugin: ObsidianTypstMate;
  tfile?: TFile;

  view!: EditorView;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianTypstMate) {
    super(leaf);
    this.plugin = plugin;
  }

  override getIcon(): string {
    return 'typst-fill';
  }

  override getViewType() {
    return TypstTextView.viewtype;
  }

  override getDisplayText() {
    return this.file?.name ?? 'Typst Text';
  }

  override getViewData() {
    return '';
  }

  override setViewData() {}

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();

    this.tfile = file;
    const fileContent = await this.app.vault.read(file);
    const startState = EditorState.create({
      doc: fileContent,
      extensions: [createDocChangePlugin(this.plugin)],
    });

    this.view = new EditorView({ parent: this.contentEl, state: startState });
    this.view.dom.style.height = '100%';
    this.view.dom.style.stroke = 'none';
  }

  override clear() {}
}
