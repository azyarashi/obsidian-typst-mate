import { type Menu, TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';

import { jumpFromClickExtension } from '@/editor/typst/extensions/actions/JumpFromClick';
import type ObsidianTypstMate from '@/main';
import type { TypstTextView } from '../typst-text/typstText';

import './typst-preview.css';

interface PreviewViewerState {
  currentPage: number;
  scrollTop: number;
  scale: number;
}

export class TypstPreviewView extends TextFileView {
  static viewtype = 'typst-preview';
  plugin: ObsidianTypstMate;

  parentTextView: TypstTextView | null = null;

  fileContent?: string;
  svgPages: string[] = [];
  viewerState: PreviewViewerState = {
    currentPage: 1,
    scrollTop: 0,
    scale: 1.0,
  };

  private controlsEl?: HTMLElement;
  private viewerAreaEl?: HTMLElement;
  private pageContainerEl?: HTMLElement;
  private pageInfoEl?: HTMLElement;
  private zoomInfoEl?: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianTypstMate) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TypstPreviewView.viewtype;
  }

  override onPaneMenu(menu: Menu, source: string) {
    menu.addItem((item) => {
      item.setTitle('Open as text').onClick(async () => {
        try {
          if (!this.file) return;
          const leaf = this.app.workspace.getLeaf(false);
          await leaf.setViewState({
            type: 'typst-text',
            state: { file: this.file.path },
          });
        } catch (e) {
          console.error('Open as text failed:', e);
        }
      });
    });

    super.onPaneMenu(menu, source);
  }

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('typstmate-preview-viewer-container');
    this.clearViewerReferences();

    try {
      this.fileContent = await this.app.vault.read(file);
      const result = await this.plugin.typst.svgp('/', file.name, this.fileContent);
      this.svgPages = result.svgp;

      await this.renderPreview();
    } catch (e) {
      console.error('Initial SVG generation failed', e);
    }
  }

  override async onModify(file: TFile): Promise<void> {
    if (this.parentTextView) return;

    const currentScrollTop = this.viewerAreaEl?.scrollTop || 0;
    const currentPage = this.calculateCurrentPageFromScroll();
    const currentScale = this.viewerState.scale;

    try {
      this.fileContent = await this.app.vault.read(file);
      const result = await this.plugin.typst.svgp('/', file.name, this.fileContent);
      this.svgPages = result.svgp;

      if (!this.pageContainerEl || !this.viewerAreaEl) return;

      const newPageContainer = document.createElement('div');
      newPageContainer.className = 'typstmate-preview-page-container';
      await this.renderAllPagesToContainer(newPageContainer);

      this.pageContainerEl.replaceWith(newPageContainer);
      this.pageContainerEl = newPageContainer;

      this.viewerState.scale = currentScale;
      this.viewerState.scrollTop = currentScrollTop;
      this.viewerState.currentPage = currentPage;

      this.updateControls();
      this.viewerAreaEl.scrollTop = currentScrollTop;
    } catch {}
  }

  override async onClose(): Promise<void> {
    this.clearViewerReferences();
  }

  override getViewData(): string {
    return JSON.stringify(this.viewerState);
  }

  override setViewData(data: string, _clear: boolean): void {
    if (!data) return;

    try {
      const parsedState = JSON.parse(data);
      this.viewerState = {
        currentPage: parsedState.currentPage || 1,
        scrollTop: parsedState.scrollTop || 0,
        scale: parsedState.scale || 1.0,
      };

      this.restoreViewerState();
    } catch (e) {
      console.error('Failed to parse viewer state:', e);
    }
  }

  override clear(): void {
    this.clearViewerReferences();
  }

  override requestSave = () => {};

  private async renderPreview(): Promise<void> {
    try {
      this.createViewer();
      this.restoreViewerState();
    } catch (error) {
      console.error('Preview rendering failed:', error);
    }
  }

  private createViewer(): void {
    this.controlsEl = this.contentEl.createDiv('typstmate-preview-controls');

    const prevButton = this.controlsEl.createEl('button', { text: '←' });
    prevButton.addEventListener('click', () => this.goToPreviousPage());

    this.pageInfoEl = this.controlsEl.createEl('span');
    this.pageInfoEl.textContent = `Page ${this.viewerState.currentPage} of ${this.svgPages.length}`;

    const nextButton = this.controlsEl.createEl('button', { text: '→' });
    nextButton.addEventListener('click', () => this.goToNextPage());

    const zoomOutButton = this.controlsEl.createEl('button', { text: '-' });
    zoomOutButton.addEventListener('click', () => this.zoomOut());

    this.zoomInfoEl = this.controlsEl.createEl('span');
    this.zoomInfoEl.textContent = `${Math.round(this.viewerState.scale * 100)}%`;

    const zoomInButton = this.controlsEl.createEl('button', { text: '+' });
    zoomInButton.addEventListener('click', () => this.zoomIn());

    this.viewerAreaEl = this.contentEl.createDiv('typstmate-preview-viewer-area');
    this.pageContainerEl = this.viewerAreaEl.createDiv('typstmate-preview-page-container');

    this.renderAllPagesToContainer(this.pageContainerEl);

    this.viewerAreaEl.addEventListener('scroll', () => {
      this.viewerState.scrollTop = this.viewerAreaEl!.scrollTop;
      this.updateCurrentPageFromScroll();
    });
  }

  private async goToPreviousPage(): Promise<void> {
    if (this.viewerState.currentPage <= 1) return;

    this.viewerState.currentPage--;
    await this.scrollToPage(this.viewerState.currentPage);
    this.saveViewerState();
  }

  private async goToNextPage(): Promise<void> {
    if (this.viewerState.currentPage >= this.svgPages.length) return;

    this.viewerState.currentPage++;
    await this.scrollToPage(this.viewerState.currentPage);
    this.saveViewerState();
  }

  private async scrollToPage(pageNumber: number): Promise<void> {
    if (!this.viewerAreaEl) return;

    const pageElement = this.viewerAreaEl.querySelector(`#preview-page-${pageNumber}`);
    if (pageElement) pageElement.scrollIntoView({ behavior: 'smooth' });
    this.updateControls();
  }

  private async zoomOut(): Promise<void> {
    this.viewerState.scale = Math.max(0.25, this.viewerState.scale - 0.25);
    this.updatePagesScale();
    this.saveViewerState();
    this.updateControls();
  }

  private async zoomIn(): Promise<void> {
    this.viewerState.scale = Math.min(3.0, this.viewerState.scale + 0.25);
    this.updatePagesScale();
    this.saveViewerState();
    this.updateControls();
  }

  private updateControls(): void {
    if (this.pageInfoEl)
      this.pageInfoEl.textContent = `Page ${this.viewerState.currentPage} of ${this.svgPages.length}`;
    if (this.zoomInfoEl) this.zoomInfoEl.textContent = `${Math.round(this.viewerState.scale * 100)}%`;
  }

  private saveViewerState(): void {
    if (this.viewerAreaEl) this.viewerState.scrollTop = this.viewerAreaEl.scrollTop;
  }

  private restoreViewerState(): void {
    if (this.viewerAreaEl) this.viewerAreaEl.scrollTop = this.viewerState.scrollTop;
    this.updateControls();
  }

  private updateCurrentPageFromScroll(): void {
    if (!this.viewerAreaEl || !this.pageInfoEl) return;

    const scrollTop = this.viewerAreaEl.scrollTop;
    const pageElements = this.viewerAreaEl.querySelectorAll('.typstmate-preview-page');

    let currentPage = 1;
    let minDistance = Infinity;

    pageElements.forEach((pageElement, index) => {
      const htmlElement = pageElement as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const pageTop = rect.top + scrollTop - this.viewerAreaEl!.offsetTop;

      const viewerCenter = scrollTop + this.viewerAreaEl!.clientHeight / 2;
      const distance = Math.abs(viewerCenter - (pageTop + rect.height / 2));

      if (distance < minDistance) {
        minDistance = distance;
        currentPage = index + 1;
      }
    });

    if (this.viewerState.currentPage !== currentPage) {
      this.viewerState.currentPage = currentPage;
      this.updateControls();
      this.saveViewerState();
    }
  }

  private calculateCurrentPageFromScroll(): number {
    if (!this.viewerAreaEl) return 1;

    const scrollTop = this.viewerAreaEl.scrollTop;
    const pageElements = this.viewerAreaEl.querySelectorAll('.typstmate-preview-page');

    let currentPage = 1;
    let minDistance = Infinity;

    pageElements.forEach((pageElement, index) => {
      const htmlElement = pageElement as HTMLElement;
      const rect = htmlElement.getBoundingClientRect();
      const pageTop = rect.top + scrollTop - this.viewerAreaEl!.offsetTop;

      const viewerCenter = scrollTop + this.viewerAreaEl!.clientHeight / 2;
      const distance = Math.abs(viewerCenter - (pageTop + rect.height / 2));

      if (distance < minDistance) {
        minDistance = distance;
        currentPage = index + 1;
      }
    });

    return currentPage;
  }

  private async renderAllPagesToContainer(container: HTMLElement): Promise<void> {
    container.empty();

    for (let i = 0; i < this.svgPages.length; i++) {
      const pageNumber = i + 1;
      const svgContent = this.svgPages[i];

      const pageDiv = container.createDiv('typstmate-preview-page');
      pageDiv.id = `preview-page-${pageNumber}`;
      if (svgContent) {
        pageDiv.innerHTML = svgContent;
      }

      const svgEl = pageDiv.querySelector('svg');
      if (svgEl) {
        const widthMatches = svgEl.getAttribute('width')?.match(/([\d.]+)pt/);
        const heightMatches = svgEl.getAttribute('height')?.match(/([\d.]+)pt/);

        if (widthMatches?.[1] && heightMatches && heightMatches[1]) {
          const w = parseFloat(widthMatches[1]);
          const h = parseFloat(heightMatches[1]);
          pageDiv.dataset.width = w.toString();
          pageDiv.dataset.height = h.toString();
        }
      }

      pageDiv.addEventListener('click', async (event) => {
        await this.jump(event, pageNumber - 1, pageDiv);
      });
    }
    this.updatePagesScale(container);
  }

  private async jump(event: MouseEvent, pageIndex: number, pageDiv: HTMLElement) {
    const svg = pageDiv.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / (rect.width / svg.viewBox.baseVal.width);
    const y = (event.clientY - rect.top) / (rect.height / svg.viewBox.baseVal.height);

    await this.plugin.typst.svgp('/', this.fileContent ? this.file!.name : 'preview.typ', this.fileContent || '');
    const result = await this.plugin.typst.jumpFromClickP(pageIndex, x, y);

    if (!result || !this.parentTextView) return;

    this.app.workspace.revealLeaf(this.parentTextView.leaf);
    const plugin = this.parentTextView.view.plugin(jumpFromClickExtension);
    plugin?.jumpTo(result, event);
  }

  private updatePagesScale(container: HTMLElement | undefined = this.pageContainerEl) {
    if (!container) return;
    const pageElements = container.querySelectorAll('.typstmate-preview-page');
    pageElements.forEach((pageElement) => {
      const htmlElement = pageElement as HTMLElement;
      const svgEl = htmlElement.querySelector('svg');
      if (svgEl && htmlElement.dataset.width && htmlElement.dataset.height) {
        const w = parseFloat(htmlElement.dataset.width);
        const h = parseFloat(htmlElement.dataset.height);

        const scaledWidth = w * this.viewerState.scale;
        const scaledHeight = h * this.viewerState.scale;

        svgEl.style.width = `${scaledWidth}pt`;
        svgEl.style.height = `${scaledHeight}pt`;
        svgEl.style.display = 'block';
      } else if (svgEl) {
        svgEl.style.transform = `scale(${this.viewerState.scale})`;
        svgEl.style.transformOrigin = `top left`;
      }
    });
  }

  // TypstTextView から呼ばれる
  async updatePreview(svgPages: string[], _diags?: any[]): Promise<void> {
    const currentScrollTop = this.viewerAreaEl?.scrollTop || 0;
    const currentPage = this.calculateCurrentPageFromScroll();
    const currentScale = this.viewerState.scale;

    try {
      this.svgPages = svgPages;

      if (!this.pageContainerEl || !this.viewerAreaEl) {
        await this.renderPreview();
        return;
      }

      const newPageContainer = document.createElement('div');
      newPageContainer.className = 'typstmate-preview-page-container';
      await this.renderAllPagesToContainer(newPageContainer);

      this.pageContainerEl.replaceWith(newPageContainer);
      this.pageContainerEl = newPageContainer;

      this.viewerState.scale = currentScale;
      this.viewerState.scrollTop = currentScrollTop;
      this.viewerState.currentPage = currentPage;

      this.updateControls();
      this.viewerAreaEl.scrollTop = currentScrollTop;
    } catch (e) {
      console.error('[TypstMate] PDF updatePreview failed:', e);
    }
  }

  private clearViewerReferences(): void {
    this.controlsEl = undefined;
    this.viewerAreaEl = undefined;
    this.pageContainerEl = undefined;
    this.pageInfoEl = undefined;
    this.zoomInfoEl = undefined;
  }
}
