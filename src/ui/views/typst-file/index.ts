import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  debounce,
  type Menu,
  TextFileView,
  TFile,
  type View,
  type ViewStateResult,
  type WorkspaceLeaf,
} from 'obsidian';
import {
  buildTypstTextExtensions,
  codeJumpTargetFacet,
  formatterSettingsFacet,
  updateDiagnosticEffect,
  vimQuitFacet,
  vimSaveFacet,
} from '@/editor';
import { fileManager, rendererManager, settingsManager } from '@/libs';
import { viewTracker } from '@/libs/extensionManager';
import { t } from '@/libs/i18n';
import { ExportToolModal } from '@/ui/modals/exportTool';
import { TypstPreviewView } from '@/ui/views/typst-preview';
import { exportToPdf } from '@/utils/export';
import { consoleError } from '@/utils/notice';

import './typst-file.css';

export class TypstFileView extends TextFileView {
  static viewtype = 'typst-file';

  vpath: string | undefined;
  isExternal: boolean = false;
  linkedPreviewLeaf: WorkspaceLeaf | null = null;

  view!: EditorView;

  override requestSave = debounce(this.save.bind(this), 1000);

  override getIcon(): string {
    return 'typst-fill';
  }

  override getViewType() {
    return TypstFileView.viewtype;
  }

  private resolveVPath(): string | undefined {
    if (this.vpath) return this.vpath;
    this.vpath = this.file?.path;
    return this.vpath;
  }

  override async onload(): Promise<void> {
    // 念の為 await
    await super.onload();
    this.resolveVPath();

    this.addAction('upload', t('views.typstFile.actions.exportAsPdf'), () => {
      if (!this.vpath) return;
      new ExportToolModal(this.app, this.vpath, this.view.state.doc.toString()).open();
    });

    this.addAction('file-image', t('views.typstFile.actions.exportAsPdf'), async () => {
      if (!this.vpath) return;
      const path = await exportToPdf(this.vpath, this.view.state.doc.toString(), {
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

    this.addAction('eye', t('views.typstFile.actions.openPreview'), async () => {
      this.openPreview();
    });
  }

  override async setState(state: Record<string, unknown>, result: ViewStateResult) {
    await super.setState(state, result);
    if (state.openPreview) this.openPreview();
  }

  override async setEphemeralState(state: unknown) {
    super.setEphemeralState(state);
    console.log(state);
  }

  async openPreview() {
    if (this.linkedPreviewLeaf && this.linkedPreviewLeaf.view instanceof TypstPreviewView) {
      this.app.workspace.revealLeaf(this.linkedPreviewLeaf);
      const container = this.linkedPreviewLeaf.containerEl;
      container.addClass('typstmate-linked-view-highlight');
      setTimeout(() => container.removeClass('typstmate-linked-view-highlight'), 700);
      return;
    }

    const newLeaf = this.app.workspace.getLeaf('split', 'vertical');
    await newLeaf.setViewState({
      type: TypstPreviewView.viewtype,
      state: { file: this.file?.path, vpath: this.vpath },
    });
    this.linkedPreviewLeaf = newLeaf;

    const previewView = newLeaf.view;
    if (previewView instanceof TypstPreviewView) previewView.parentFileView = this;
  }

  async onLoadExternalFile(): Promise<void> {
    // not implemented
  }

  override onPaneMenu(menu: Menu, source: string) {
    menu.addItem((item) => {
      item.setTitle(t('contextMenu.openWithDefaultApp')).onClick(async () => {
        if (!this.vpath) return;
        try {
          this.app.openWithDefaultApp(this.vpath);
        } catch (e) {
          // TODO
          consoleError('app.openWithDefaultApp failed', e);
        }
      });
    });

    super.onPaneMenu(menu, source);
  }

  override async save(_?: boolean): Promise<void> {
    if (!this.vpath) return;

    const settings = this.view.state.facet(formatterSettingsFacet);
    if (settings?.formatOnSave) this.app.commands.executeCommandById('typst-mate:run-typstyle');

    const content = this.view.state.doc.toString();
    await fileManager.writeString(this.vpath, content);
    await this.compileAndUpdate(content);

    // タグの更新
    const resourcesPath = settingsManager.settings.resourcesPath;
    if (!this.vpath.startsWith(`${resourcesPath}/tags/`)) return;

    const typstPath = this.vpath.slice(resourcesPath.length);
    rendererManager.wasm.store({ files: new Map([[typstPath, content]]) });

    const tag = typstPath
      .slice(resourcesPath.length + 1) // resourcesPath + "/" の分
      .slice(5) // "tags/" の分
      .slice(0, -4) // ".typ" の分
      .replaceAll('.', '/');
    rendererManager.tagFiles.add(tag);
  }

  private async compileAndUpdate(content: string): Promise<void> {
    if (!this.vpath) return;
    if (!rendererManager.ready) return;
    this.removeWaiting();

    if (!this.extensionsInitialized) {
      this.view.dispatch({
        effects: this.extensionCompartment.reconfigure(this.buildExtensions()),
      });
      this.extensionsInitialized = true;
    }

    try {
      const result = await rendererManager.wasm.svgpAsync(this.vpath, content);

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
    const vpath = this.resolveVPath();
    return vpath ? fileManager.getFilename(vpath) : t('views.typstFile.displayText');
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
    this.waitingEl.createEl('span', { text: t('common.waitingForLoad') });
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
      ...buildTypstTextExtensions(),
      viewTracker('typst'),
      codeJumpTargetFacet.of({
        jumpToPosition: async (position: { page: number; x: number; y: number }) => {
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
      vimSaveFacet.of(() => this.requestSave()),
      vimQuitFacet.of(() => {
        if (this.linkedPreviewLeaf) this.linkedPreviewLeaf.detach();
        this.leaf.detach();
      }),
    ];
  }

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();

    const fileContent = await this.app.vault.read(file);

    const startState = EditorState.create({
      doc: fileContent,
      extensions: this.extensionCompartment.of(this.buildExtensions()),
    });

    this.view = new EditorView({ parent: this.contentEl, state: startState });

    this.findAndLinkPreview();

    if (!rendererManager.ready) this.renderWaiting();
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
      const previewView = leaf.view as TypstPreviewView;
      if (previewView.vpath !== this.vpath) continue;

      this.linkedPreviewLeaf = leaf;
      previewView.parentFileView = this;
      break;
    }
  }
}

export function isTypstFileView(view: View): view is TypstFileView {
  return view.getViewType() === TypstFileView.viewtype;
}
