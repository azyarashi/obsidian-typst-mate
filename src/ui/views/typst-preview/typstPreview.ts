import { type Menu, TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';

import { jumpFromClickExtension } from '@/editor/typst/extensions/JumpFromClick';
import { t } from '@/i18n';
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
  private pageInputEl?: HTMLInputElement;
  private totalPagesLabelEl?: HTMLElement;
  private zoomInfoEl?: HTMLElement;
  private zoomSliderEl?: HTMLInputElement;

  private isPanning = false;
  private startX = 0;
  private startY = 0;
  private scrollStartX = 0;
  private scrollStartY = 0;

  private isProgrammaticScroll = false;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianTypstMate) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TypstPreviewView.viewtype;
  }

  override onPaneMenu(menu: Menu, source: string) {
    menu.addItem((item) => {
      item.setTitle(t('contextMenu.openAsText')).onClick(async () => {
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
      this.fitToPage(false);

      if (this.viewerState.scrollTop === 0) requestAnimationFrame(() => this.scrollToPage(1, 'auto'));
      else this.restoreViewerState();
    } catch (error) {
      console.error('Preview rendering failed:', error);
    }
  }

  private createViewer(): void {
    this.controlsEl = this.contentEl.createDiv('typstmate-preview-controls');

    const prevButton = this.controlsEl.createEl('button', { text: '←' });
    prevButton.addEventListener('click', () => this.goToPreviousPage());

    const pageInfoContainer = this.controlsEl.createDiv('typstmate-preview-page-info');
    this.pageInputEl = pageInfoContainer.createEl('input', {
      type: 'number',
      cls: 'typstmate-preview-page-input',
    });
    this.pageInputEl.min = '1';
    this.pageInputEl.max = this.svgPages.length.toString();
    this.pageInputEl.value = this.viewerState.currentPage.toString();
    this.pageInputEl.addEventListener('change', () => {
      const pageNum = parseInt(this.pageInputEl!.value, 10);
      if (pageNum >= 1 && pageNum <= this.svgPages.length) {
        this.viewerState.currentPage = pageNum;
        this.fitToPage(true);
      } else {
        this.pageInputEl!.value = this.viewerState.currentPage.toString();
      }
    });

    this.totalPagesLabelEl = pageInfoContainer.createEl('span');
    this.totalPagesLabelEl.textContent = ` / ${this.svgPages.length}`;

    const nextButton = this.controlsEl.createEl('button', { text: '→' });
    nextButton.addEventListener('click', () => this.goToNextPage());

    const resetButton = this.controlsEl.createEl('button', { text: t('views.typstPreview.buttons.reset') });
    resetButton.title = t('views.typstPreview.fitToPage');
    resetButton.addEventListener('click', () => this.fitToPage(true));

    this.zoomSliderEl = this.controlsEl.createEl('input', {
      type: 'range',
      cls: 'typstmate-preview-zoom-slider',
    });
    this.zoomSliderEl.min = '20';
    this.zoomSliderEl.max = '1000';
    this.zoomSliderEl.value = Math.round(this.viewerState.scale * 100).toString();
    this.zoomSliderEl.addEventListener('input', () => {
      if (!this.viewerAreaEl) return;

      const oldScale = this.viewerState.scale;
      const newScale = parseInt(this.zoomSliderEl!.value, 10) / 100;
      if (oldScale === newScale) return;

      const centerX = this.viewerAreaEl.clientWidth / 2;
      const centerY = this.viewerAreaEl.clientHeight / 2;

      const contentX = (this.viewerAreaEl.scrollLeft + centerX) / oldScale;
      const contentY = (this.viewerAreaEl.scrollTop + centerY) / oldScale;

      this.viewerState.scale = newScale;
      this.updatePagesScale();
      this.updateControls();

      this.viewerAreaEl.scrollLeft = contentX * newScale - centerX;
      this.viewerAreaEl.scrollTop = contentY * newScale - centerY;

      this.saveViewerState();
    });

    this.zoomInfoEl = this.controlsEl.createEl('span');
    this.zoomInfoEl.textContent = `${Math.round(this.viewerState.scale * 100)}%`;

    this.viewerAreaEl = this.contentEl.createDiv('typstmate-preview-viewer-area');
    this.pageContainerEl = this.viewerAreaEl.createDiv('typstmate-preview-page-container');

    this.renderAllPagesToContainer(this.pageContainerEl);

    this.viewerAreaEl.addEventListener('scroll', () => {
      this.viewerState.scrollTop = this.viewerAreaEl!.scrollTop;
      this.updateCurrentPageFromScroll();
    });

    this.viewerAreaEl.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleZoomWheel(e);
        }
      },
      { passive: false },
    );

    this.viewerAreaEl.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0 && e.button !== 1) return;
    if (!this.viewerAreaEl) return;

    this.isPanning = true;
    this.viewerAreaEl.addClass('is-grabbing');
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.scrollStartX = this.viewerAreaEl.scrollLeft;
    this.scrollStartY = this.viewerAreaEl.scrollTop;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isPanning || !this.viewerAreaEl) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;

    this.viewerAreaEl.scrollLeft = this.scrollStartX - dx;
    this.viewerAreaEl.scrollTop = this.scrollStartY - dy;
  }

  private handleMouseUp(): void {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.viewerAreaEl?.removeClass('is-grabbing');
  }

  private handleZoomWheel(e: WheelEvent): void {
    if (!this.viewerAreaEl) return;

    const zoomStep = 0.05;
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1 + zoomStep : 1 - zoomStep;

    const oldScale = this.viewerState.scale;
    let newScale = oldScale * factor;
    newScale = Math.min(20.0, Math.max(0.2, newScale));

    if (oldScale === newScale) return;

    const rect = this.viewerAreaEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scrollLeft = this.viewerAreaEl.scrollLeft;
    const scrollTop = this.viewerAreaEl.scrollTop;

    const contentX = (scrollLeft + mouseX) / oldScale;
    const contentY = (scrollTop + mouseY) / oldScale;

    this.viewerState.scale = newScale;
    this.updatePagesScale();
    this.updateControls();

    this.viewerAreaEl.scrollLeft = contentX * newScale - mouseX;
    this.viewerAreaEl.scrollTop = contentY * newScale - mouseY;

    this.saveViewerState();
  }

  private async goToPreviousPage(): Promise<void> {
    if (this.viewerState.currentPage <= 1) return;

    this.viewerState.currentPage--;
    this.fitToPage(true);
    this.saveViewerState();
  }

  private async goToNextPage(): Promise<void> {
    if (this.viewerState.currentPage >= this.svgPages.length) return;

    this.viewerState.currentPage++;
    this.fitToPage(true);
    this.saveViewerState();
  }

  private async scrollToPage(pageNumber: number, behavior: ScrollBehavior = 'auto'): Promise<void> {
    if (!this.viewerAreaEl) return;

    const pageElement = this.viewerAreaEl.querySelector(`#preview-page-${pageNumber}`) as HTMLElement;
    if (pageElement) pageElement.scrollIntoView({ behavior, block: 'start', inline: 'center' });
    this.updateControls();
  }

  private updateControls(): void {
    if (this.pageInputEl) {
      this.pageInputEl.value = this.viewerState.currentPage.toString();
      this.pageInputEl.max = this.svgPages.length.toString();
    }
    if (this.totalPagesLabelEl) {
      this.totalPagesLabelEl.textContent = ` / ${this.svgPages.length}`;
    }
    if (this.zoomInfoEl) this.zoomInfoEl.textContent = `${Math.round(this.viewerState.scale * 100)}%`;
    if (this.zoomSliderEl) this.zoomSliderEl.value = Math.round(this.viewerState.scale * 100).toString();
  }

  private fitToPage(forceScroll = false): void {
    if (!this.viewerAreaEl || this.svgPages.length === 0) return;

    const pageIdx = Math.max(0, this.viewerState.currentPage - 1);
    const svgContent = this.svgPages[pageIdx];
    if (!svgContent) return;

    const widthMatch = svgContent.match(/width="([\d.]+)pt"/);
    const heightMatch = svgContent.match(/height="([\d.]+)pt"/);
    if (!widthMatch?.[1] || !heightMatch?.[1]) return;

    const pageWidthPt = parseFloat(widthMatch[1]);
    const pageHeightPt = parseFloat(heightMatch[1]);
    if (pageWidthPt === 0 || pageHeightPt === 0) return;

    const viewerWidth = this.viewerAreaEl.clientWidth;
    const viewerHeight = this.viewerAreaEl.clientHeight;

    if (viewerWidth === 0 || viewerHeight === 0) {
      setTimeout(() => this.fitToPage(forceScroll), 50);
      return;
    }

    const ptToPx = 96 / 72;
    const pageWidthPx = pageWidthPt * ptToPx;
    const pageHeightPx = pageHeightPt * ptToPx;

    const scaleX = viewerWidth / pageWidthPx;
    const scaleY = viewerHeight / pageHeightPx;

    this.viewerState.scale = Math.min(scaleX, scaleY);
    this.viewerState.scale = Math.min(20.0, Math.max(0.2, this.viewerState.scale));

    this.updatePagesScale();
    this.updateControls();

    if (forceScroll) {
      void this.viewerAreaEl.offsetHeight;
      this.scrollToPage(this.viewerState.currentPage, 'auto');
    } else {
      this.viewerAreaEl.scrollLeft = 0;
    }
  }

  private saveViewerState(): void {
    if (this.viewerAreaEl) this.viewerState.scrollTop = this.viewerAreaEl.scrollTop;
  }

  private restoreViewerState(): void {
    if (this.viewerAreaEl) this.viewerAreaEl.scrollTop = this.viewerState.scrollTop;
    this.updateControls();
  }

  private updateCurrentPageFromScroll(): void {
    if (!this.viewerAreaEl || !this.pageInputEl || this.isPanning || this.isProgrammaticScroll) return;

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
    if (this.isPanning || event.detail === 0) return;

    const dx = Math.abs(event.clientX - this.startX);
    const dy = Math.abs(event.clientY - this.startY);
    if (dx > 5 || dy > 5) return;

    const svg = pageDiv.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();

    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      return;

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

  async jumpToPosition(position: { page: number; x: number; y: number }): Promise<void> {
    if (!this.viewerAreaEl) return;

    const pageElement = this.viewerAreaEl.querySelector(`#preview-page-${position.page}`) as HTMLElement;
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.viewerState.currentPage = position.page;
      this.updateControls();

      setTimeout(() => {
        this.triggerRipple(position);
      }, 100);
    }
  }

  triggerRipple(position: { page: number; x: number; y: number }): void {
    if (!this.viewerAreaEl) return;
    const pageElement = this.viewerAreaEl.querySelector(`#preview-page-${position.page}`) as HTMLElement;
    if (!pageElement) return;

    const svg = pageElement.querySelector('svg');
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    const scaleX = svgRect.width / (viewBox.width || 1);
    const scaleY = svgRect.height / (viewBox.height || 1);

    const xInPage = svgRect.left - pageRect.left + position.x * scaleX;
    const yInPage = svgRect.top - pageRect.top + position.y * scaleY;

    const ripple = document.createElement('div');
    ripple.className = 'typstmate-jump-ripple';
    ripple.style.position = 'absolute';
    ripple.style.left = `${xInPage}px`;
    ripple.style.top = `${yInPage}px`;
    pageElement.appendChild(ripple);

    setTimeout(() => ripple.remove(), 1000);
  }

  private clearViewerReferences(): void {
    this.controlsEl = undefined;
    this.viewerAreaEl = undefined;
    this.pageContainerEl = undefined;
    this.pageInputEl = undefined;
    this.totalPagesLabelEl = undefined;
    this.zoomInfoEl = undefined;
  }
}
