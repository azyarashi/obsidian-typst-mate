import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { debounce, type Menu, TextFileView, TFile, type View, type WorkspaceLeaf } from 'obsidian';

import { updateDiagnosticEffect } from '@/editor/shared/extensions/Diagnostic';
import { formatterSettingsFacet } from '@/editor/shared/extensions';
import { buildTypstTextExtensions } from '@/editor/typst/build';
import { jumpToPreviewTargetFacet } from '@/editor/typst/extensions/JumpToPreview';
import { t } from '@/i18n';
import { editorHelper, settingsManager, typstManager } from '@/libs';
import { viewTracker } from '@/libs/extensionManager';
import type ObsidianTypstMate from '@/main';
import { exportToPdf } from '@/utils/export';
import { TypstPreviewView } from '../typst-preview';
import { ExportToolModal } from './exportTool';

export class TypstFileView extends TextFileView {
  static viewtype = 'typst-file';

  plugin: ObsidianTypstMate;

  view!: EditorView;

  linkedPreviewLeaf: WorkspaceLeaf | null = null;

  override requestSave = debounce(this.save.bind(this), 1000);

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianTypstMate) {
    super(leaf);
    this.plugin = plugin;
  }

  override getIcon(): string {
    return 'typst-fill';
  }

  override getViewType() {
    return TypstFileView.viewtype;
  }

  override async onload(): Promise<void> {
    // 念の為 await
    await super.onload();

    this.addAction('upload', t('views.typstText.actions.export'), () => {
      if (!this.file) return;
      new ExportToolModal(this.app, this.plugin, this.file, this.view.state.doc.toString()).open();
    });

    this.addAction('file-image', t('views.typstText.actions.exportAsPdf'), async () => {
      if (!this.file) return;
      const path = await exportToPdf(this.plugin, this.file, this.view.state.doc.toString(), {
        tagged: true,
        standards: [],
      });
      if (path) {
        const pdfFile = this.app.vault.getAbstractFileByPath(path);
        if (pdfFile instanceof TFile) {
          const leaf = this.app.workspace.getLeaf('split', 'vertical');
          await leaf.openFile(pdfFile);
        }
      }
    });

    this.addAction('eye', t('views.typstText.actions.openAsPreview'), async () => {
      if (this.linkedPreviewLeaf && this.linkedPreviewLeaf.view instanceof TypstPreviewView) {
        this.app.workspace.revealLeaf(this.linkedPreviewLeaf);
        return;
      }

      const newLeaf = this.app.workspace.getLeaf('split', 'vertical');
      await newLeaf.setViewState({
        type: TypstPreviewView.viewtype,
        state: { file: this.file?.path },
      });
      this.linkedPreviewLeaf = newLeaf;

      const previewView = newLeaf.view;
      if (previewView instanceof TypstPreviewView) previewView.parentFileView = this;

      const detach = this.app.workspace.on('layout-change', () => {
        if (
          this.linkedPreviewLeaf &&
          !this.app.workspace.getLeavesOfType(TypstPreviewView.viewtype).includes(this.linkedPreviewLeaf)
        ) {
          const previewView = this.linkedPreviewLeaf.view;
          if (previewView instanceof TypstPreviewView) previewView.parentFileView = null;
          this.linkedPreviewLeaf = null;
          this.app.workspace.offref(detach);
        }
      });
      this.register(() => this.app.workspace.offref(detach));
    });
  }

  override onPaneMenu(menu: Menu, source: string) {
    menu.addItem((item) => {
      item.setTitle(t('contextMenu.openWithDefaultApp')).onClick(async () => {
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
    const settings = this.view.state.facet(formatterSettingsFacet);
    if (settings?.formatOnSave) this.app.commands.executeCommandById('typst-mate:run-typstyle');
    await super.save(clear);
    if (!this.file) return;

    const content = this.view.state.doc.toString();
    await this.plugin.app.vault.adapter.write(this.file.path, content);

    await this.compileAndUpdate(content);

    // タグの更新
    const importPath = settingsManager.settings.importPath;
    if (!this.file.path.startsWith(`${importPath}/tags/`)) return;

    const typstPath = this.file.path.slice(importPath.length);
    typstManager.wasm.store({ files: new Map([[typstPath, content]]) });

    const tag = typstPath
      .slice(importPath.length + 1) // importPath + "/" の分
      .slice(5) // "tags/" の分
      .slice(0, -4) // ".typ" の分
      .replaceAll('.', '/');
    typstManager.tagFiles.add(tag);
  }

  private async compileAndUpdate(content: string): Promise<void> {
    if (!this.file) return;

    if (!typstManager.ready) return;
    this.removeWaiting();

    if (!this.extensionsInitialized) {
      // Reconfigure extensions if they might have changed (e.g. extensionManager initialized)
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure(this.buildExtensions()),
      });
      this.extensionsInitialized = true;
    }

    try {
      const result = await typstManager.wasm.svgpAsync('/', this.file.name, content);

      updateDiagnosticEffect(this.view, {
        diagnostics: result.diags,
        noDiag: false,
        offset: 0,
      });
      if (this.linkedPreviewLeaf) {
        const previewView = this.linkedPreviewLeaf.view;
        if (previewView instanceof TypstPreviewView) await previewView.updatePreview(result.svgp);
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

  private extensionsInitialized = false;

  override getDisplayText() {
    return this.file?.name ?? t('views.typstText.displayText');
  }

  override getViewData() {
    return this.view?.state.doc.toString() ?? '';
  }

  override setViewData() {}

  debouncedCompile = debounce(
    () => {
      if (!this.view) return;
      const content = this.view.state.doc.toString();
      this.compileAndUpdate(content);
    },
    200,
    false,
  );

  private waitingEl?: HTMLElement;

  private renderWaiting(): void {
    if (this.waitingEl) return;
    this.waitingEl = this.contentEl.createDiv('typstmate-waiting-banner');
    this.waitingEl.createEl('span', { text: t('views.typstText.waiting') });
  }

  private removeWaiting(): void {
    if (this.waitingEl) {
      this.waitingEl.remove();
      this.waitingEl = undefined;
    }
  }

  private extensionCompartment = new Compartment();

  private buildExtensions(): any[] {
    return [
      ...buildTypstTextExtensions(editorHelper),
      viewTracker('typst'),
      jumpToPreviewTargetFacet.of({
        jumpToPosition: async (position) => {
          if (!this.linkedPreviewLeaf) return;

          const previewView = this.linkedPreviewLeaf.view;
          if (previewView instanceof TypstPreviewView) await previewView.jumpToPosition(position);
        },
        reveal: () => {
          if (!this.linkedPreviewLeaf) return;

          this.app.workspace.revealLeaf(this.linkedPreviewLeaf);
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) this.debouncedCompile();
      }),
    ];
  }

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();

    const fileContent = await this.app.vault.read(file);

    const startState = EditorState.create({
      doc: fileContent,
      extensions: [this.extensionCompartment.of(this.buildExtensions())],
    });

    this.view = new EditorView({ parent: this.contentEl, state: startState });
    this.view.dom.style.height = '100%';
    this.view.dom.style.stroke = 'none';

    this.findAndLinkPreview();

    if (!typstManager.ready) this.renderWaiting();
    else this.compileAndUpdate(fileContent);
  }

  override async onClose(): Promise<void> {
    this.view?.destroy();
    this.contentEl.empty();
    if (!this.file?.deleted) this.save();
  }

  override clear() {
    this.view?.destroy();
  }

  private findAndLinkPreview() {
    const previewLeaves = this.app.workspace.getLeavesOfType(TypstPreviewView.viewtype);
    for (const leaf of previewLeaves) {
      const previewView = leaf.view;
      if (previewView instanceof TypstPreviewView && previewView.file?.path === this.file?.path) {
        this.linkedPreviewLeaf = leaf;
        previewView.parentFileView = this;
        break;
      }
    }
  }
}

export function isTypstFileView(view: View): view is TypstFileView {
  return view.getViewType() === TypstFileView.viewtype;
}
