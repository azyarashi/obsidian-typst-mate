import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { debounce, type Menu, TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';
import { updateDiagnosticEffect } from '@/editor/shared/extensions/decorations/Diagnostic';
import { buildTypstTextExtensions } from '@/editor/typst/build';
import type ObsidianTypstMate from '@/main';
import { TypstPDFView } from '../typst-pdf/typstPDF';

export class TypstTextView extends TextFileView {
  static viewtype = 'typst-text';

  plugin: ObsidianTypstMate;

  view!: EditorView;

  linkedPDFLeaf: WorkspaceLeaf | null = null;

  override requestSave = debounce(this.save.bind(this), 1000);

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

  override async onload(): Promise<void> {
    // 念の為 await
    await super.onload();

    this.addAction('eye', 'Open as PDF', async () => {
      if (this.linkedPDFLeaf && this.linkedPDFLeaf.view instanceof TypstPDFView) {
        this.app.workspace.revealLeaf(this.linkedPDFLeaf);
        return;
      }

      const newLeaf = this.app.workspace.getLeaf('split', 'vertical');
      await newLeaf.setViewState({
        type: TypstPDFView.viewtype,
        state: { file: this.file?.path },
      });
      this.linkedPDFLeaf = newLeaf;

      const pdfView = newLeaf.view;
      if (pdfView instanceof TypstPDFView) pdfView.parentTextView = this;

      const detach = this.app.workspace.on('layout-change', () => {
        if (
          this.linkedPDFLeaf &&
          !this.app.workspace.getLeavesOfType(TypstPDFView.viewtype).includes(this.linkedPDFLeaf)
        ) {
          const pdfView = this.linkedPDFLeaf.view;
          if (pdfView instanceof TypstPDFView) pdfView.parentTextView = null;
          this.linkedPDFLeaf = null;
          this.app.workspace.offref(detach);
        }
      });
      this.register(() => this.app.workspace.offref(detach));
    });
  }

  override onPaneMenu(menu: Menu, source: string) {
    menu.addItem((item) => {
      item.setTitle('Open with default app').onClick(async () => {
        try {
          if (!this.file) return;
          this.app.openWithDefaultApp(this.file.path);
        } catch (e) {
          console.error('Open with default app failed:', e);
        }
      });
    });

    super.onPaneMenu(menu, source);
  }

  override async save(clear?: boolean): Promise<void> {
    await super.save(clear);
    if (!this.file) return;

    const content = this.view.state.doc.toString();
    await this.plugin.app.vault.adapter.write(this.file.path, content);

    await this.compileAndUpdate(content);

    // タグの更新
    const importPath = this.plugin.settings.importPath;
    if (!this.file.path.startsWith(`${importPath}/tags/`)) return;

    const typstPath = this.file.path.slice(importPath.length);
    this.plugin.typst.store({ files: new Map([[typstPath, content]]) });

    const tag = typstPath
      .slice(importPath.length + 1) // importPath + "/" の分
      .slice(5) // "tags/" の分
      .slice(0, -4) // ".typ" の分
      .replaceAll('.', '/');
    this.plugin.typstManager.tagFiles.add(tag);
  }

  private async compileAndUpdate(content: string): Promise<void> {
    if (!this.file) return;

    try {
      const result = await this.plugin.typst.pdf(this.file.basename, content);

      updateDiagnosticEffect(this.view, {
        diagnostics: result.diags,
        noDiag: false,
        offset: 0,
      });
      if (this.linkedPDFLeaf) {
        const pdfView = this.linkedPDFLeaf.view;
        if (pdfView instanceof TypstPDFView) await pdfView.updatePDF(result.pdf);
      }
    } catch (e: any) {
      const diags = Array.isArray(e) ? e : [];
      updateDiagnosticEffect(this.view, {
        diagnostics: diags,
        noDiag: false,
        offset: 0,
      });
    }
  }

  override getDisplayText() {
    return this.file?.name ?? 'Typst Text';
  }

  override getViewData() {
    return this.view?.state.doc.toString() ?? '';
  }

  override setViewData() {}

  private debouncedCompile = debounce(
    () => {
      const content = this.view.state.doc.toString();
      this.compileAndUpdate(content);
    },
    100,
    true,
  );

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();

    const fileContent = await this.app.vault.read(file);

    const startState = EditorState.create({
      doc: fileContent,
      extensions: [
        ...buildTypstTextExtensions(this.plugin.editorHelper),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.debouncedCompile();
        }),
      ],
    });

    this.view = new EditorView({ parent: this.contentEl, state: startState });
    this.view.dom.style.height = '100%';
    this.view.dom.style.stroke = 'none';
  }

  override async onClose(): Promise<void> {
    this.view?.destroy();
    this.contentEl.empty();
    this.save();
  }

  override clear() {
    this.view?.destroy();
  }
}
