import { MarkdownView, Notice, type TFile, type WorkspaceLeaf } from 'obsidian';

import type ObsidianTypstMate from '@/main';

export class TypstTextView extends MarkdownView {
  static viewtype = 'typst-text';

  plugin: ObsidianTypstMate;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianTypstMate) {
    super(leaf);
    this.plugin = plugin;
  }

  override getViewType() {
    return TypstTextView.viewtype as unknown as 'markdown';
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
}
