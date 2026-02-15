import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';
import type ObsidianTypstMate from '@/main';

export class TypstTextView extends TextFileView {
  static viewtype = 'typst-text';

  plugin: ObsidianTypstMate;

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

  override async save(clear?: boolean): Promise<void> {
    await super.save(clear);
    if (!this.file) return;

    const importPath = this.plugin.settings.importPath;
    if (!this.file.path.startsWith(`${importPath}/tags/`)) return;

    const typstPath = this.file.path.slice(importPath.length);
    const content = await this.plugin.app.vault.read(this.file);
    this.plugin.typst.store({ files: new Map([[typstPath, content]]) });

    const tag = typstPath.slice(6).slice(0, -4).replaceAll('.', '/');
    this.plugin.typstManager.tagFiles.add(tag);
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

    const fileContent = await this.app.vault.read(file);
    const startState = EditorState.create({
      doc: fileContent,
      extensions: [],
    });

    this.view = new EditorView({ parent: this.contentEl, state: startState });
    this.view.dom.style.height = '100%';
    this.view.dom.style.stroke = 'none';
  }

  override clear() {}
}
