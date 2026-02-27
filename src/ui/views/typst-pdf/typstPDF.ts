import { loadPdfJs, type Menu, TextFileView, type TFile, type WorkspaceLeaf } from 'obsidian';

import type ObsidianTypstMate from '@/main';

import type { TypstTextView } from '../typst-text/typstText';

import './typst-pdf.css';

interface PDFViewerState {
  currentPage: number;
  scrollTop: number;
  scale: number;
}

export class TypstPDFView extends TextFileView {
  static viewtype = 'typst-pdf';
  plugin: ObsidianTypstMate;

  parentTextView: TypstTextView | null = null;

  fileContent?: string;
  pdfBinary?: Uint8Array;
  pdfDocument: any;
  viewerState: PDFViewerState = {
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
    return TypstPDFView.viewtype;
  }

  override onPaneMenu(menu: Menu, source: string) {
    // TODO: 毎回増える
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
          console.error('Open as Markdown failed:', e);
        }
      });
    });

    super.onPaneMenu(menu, source);
  }

  override async onLoadFile(file: TFile): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('typstmate-pdf-viewer-container');
    this.clearViewerReferences();

    try {
      this.fileContent = await this.app.vault.read(file);
      const result = await this.plugin.typst.pdf(file.basename, this.fileContent);
      this.pdfBinary = result.pdf;

      await this.renderPDF(result.pdf, file.basename);

      this.addAction('file-image', 'Export PDF', async (_eventType) => {
        const arrBuffer = new ArrayBuffer(result.pdf.length);
        const u8arr = new Uint8Array(arrBuffer);
        u8arr.set(result.pdf);
        this.plugin.app.vault.adapter.writeBinary(`${file.path.slice(0, -3)}pdf`, u8arr.buffer);
      });
    } catch {
      // コンパイルエラー時は無視 (diagnostics は TypstTextView 側で処理)
    }
  }

  override async onModify(file: TFile): Promise<void> {
    // 親の TypstTextView がある場合は, 親が更新
    if (this.parentTextView) return;

    if (!window.pdfjsLib) await loadPdfJs();

    // 状態の保存
    const currentScrollTop = this.viewerAreaEl?.scrollTop || 0;
    const currentPage = this.calculateCurrentPageFromScroll();
    const currentScale = this.viewerState.scale;

    try {
      this.fileContent = await this.app.vault.read(file);
      const result = await this.plugin.typst.pdf(file.basename, this.fileContent);
      this.pdfBinary = result.pdf;

      // ビューが未初期化の場合はレンダリングをスキップ
      if (!this.pageContainerEl || !this.viewerAreaEl) return;

      // ドキュメントを読み込む
      const loadingTask = window.pdfjsLib!.getDocument(new Uint8Array(result.pdf));
      this.pdfDocument = await loadingTask.promise;

      const newPageContainer = document.createElement('div');
      newPageContainer.className = 'typstmate-pdf-page-container';
      await this.renderAllPagesToContainer(newPageContainer);

      // 置き換え
      this.pageContainerEl.replaceWith(newPageContainer);
      this.pageContainerEl = newPageContainer;

      // 状態を設定
      this.viewerState.scale = currentScale;
      this.viewerState.scrollTop = currentScrollTop;
      this.viewerState.currentPage = currentPage;

      // コントロール情報を更新
      this.updateControls();

      // スクロール位置の復元
      this.viewerAreaEl.scrollTop = currentScrollTop;
    } catch {}
  }

  override async onClose(): Promise<void> {
    this.clearViewerReferences();
    this.pdfDocument = null;
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

      // 状態を復元
      this.restoreViewerState();
    } catch (e) {
      console.error('Failed to parse viewer state:', e);
    }
  }

  override clear(): void {
    this.clearViewerReferences();
  }

  override requestSave = () => {};

  private async renderPDF(pdfData: Uint8Array, filename: string): Promise<void> {
    if (!window.pdfjsLib) await loadPdfJs();

    try {
      const loadingTask = window.pdfjsLib!.getDocument(new Uint8Array(pdfData));
      this.pdfDocument = await loadingTask.promise;
      this.createPDFViewer();
      this.restoreViewerState();
    } catch (error) {
      console.error('PDF.js rendering failed:', error);
      this.fallbackToObjectElement(pdfData, filename);
    }
  }

  private createPDFViewer(): void {
    // コントロールバー
    this.controlsEl = this.contentEl.createDiv('typstmate-pdf-controls');

    // ページナビゲーション
    const prevButton = this.controlsEl.createEl('button', { text: '←' });
    prevButton.addEventListener('click', () => this.goToPreviousPage());

    this.pageInfoEl = this.controlsEl.createEl('span');
    this.pageInfoEl.textContent = `Page ${this.viewerState.currentPage} of ${this.pdfDocument.numPages}`;

    const nextButton = this.controlsEl.createEl('button', { text: '→' });
    nextButton.addEventListener('click', () => this.goToNextPage());

    // ズームコントロール
    const zoomOutButton = this.controlsEl.createEl('button', { text: '-' });
    zoomOutButton.addEventListener('click', () => this.zoomOut());

    this.zoomInfoEl = this.controlsEl.createEl('span');
    this.zoomInfoEl.textContent = `${Math.round(this.viewerState.scale * 100)}%`;

    const zoomInButton = this.controlsEl.createEl('button', { text: '+' });
    zoomInButton.addEventListener('click', () => this.zoomIn());

    // ビューワーエリア
    this.viewerAreaEl = this.contentEl.createDiv('typstmate-pdf-viewer-area');

    // ページコンテナ
    this.pageContainerEl = this.viewerAreaEl.createDiv('typstmate-pdf-page-container');

    // レンダリング
    this.renderAllPages();

    // スクロール位置の監視
    this.viewerAreaEl.addEventListener('scroll', () => {
      this.viewerState.scrollTop = this.viewerAreaEl!.scrollTop;
      this.updateCurrentPageFromScroll();
    });
  }

  private async renderAllPages(): Promise<void> {
    if (!this.pageContainerEl) return;

    try {
      this.pageContainerEl.empty();

      for (let pageNumber = 1; pageNumber <= this.pdfDocument.numPages; pageNumber++) {
        const pageDiv = this.pageContainerEl.createDiv('typstmate-pdf-page');
        pageDiv.id = `pdf-page-${pageNumber}`;

        const page = await this.pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: this.viewerState.scale });

        // キャンバスを作成
        const canvas = pageDiv.createEl('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) continue;

        // 画質の設定
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // テキストレイヤーを作成
        await this.renderTextLayer(page, pageDiv, viewport);
      }

      this.updateControls();
    } catch (error) {
      console.error('Failed to render all PDF pages:', error);
    }
  }

  private async renderTextLayer(page: any, container: HTMLElement, viewport: any): Promise<void> {
    try {
      const textContent = await page.getTextContent();
      const textLayerDiv = container.createDiv('typstmate-pdf-text-layer');
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      textContent.items.forEach((item: any) => {
        const textSpan = textLayerDiv.createEl('span');
        textSpan.textContent = item.str;
        textSpan.style.left = `${item.transform[4] * this.viewerState.scale}px`;
        textSpan.style.top = `${viewport.height - (item.transform[5] + 8) * this.viewerState.scale}px`;

        textSpan.style.setProperty('--typst-pdf-text-font-size', `${item.height * this.viewerState.scale}px`);
        textSpan.style.setProperty('--typst-pdf-text-font-family', item.fontName);
      });
    } catch (error) {
      console.error('Failed to render text layer:', error);
    }
  }

  private async goToPreviousPage(): Promise<void> {
    if (this.viewerState.currentPage <= 1) return;

    this.viewerState.currentPage--;
    await this.scrollToPage(this.viewerState.currentPage);
    this.saveViewerState();
  }

  private async goToNextPage(): Promise<void> {
    if (this.viewerState.currentPage >= this.pdfDocument.numPages) return;

    this.viewerState.currentPage++;
    await this.scrollToPage(this.viewerState.currentPage);
    this.saveViewerState();
  }

  private async scrollToPage(pageNumber: number): Promise<void> {
    if (!this.viewerAreaEl) return;

    const pageElement = this.viewerAreaEl.querySelector(`#pdf-page-${pageNumber}`);
    if (pageElement) pageElement.scrollIntoView({ behavior: 'smooth' });
    this.updateControls();
  }

  private async zoomOut(): Promise<void> {
    this.viewerState.scale = Math.max(0.25, this.viewerState.scale - 0.25);
    await this.renderAllPages();
    this.saveViewerState();
  }

  private async zoomIn(): Promise<void> {
    this.viewerState.scale = Math.min(3.0, this.viewerState.scale + 0.25);
    await this.renderAllPages();
    this.saveViewerState();
  }

  private updateControls(): void {
    if (this.pageInfoEl)
      this.pageInfoEl.textContent = `Page ${this.viewerState.currentPage} of ${this.pdfDocument.numPages}`;
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
    const pageElements = this.viewerAreaEl.querySelectorAll('.typstmate-pdf-page');

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

  private fallbackToObjectElement(pdfData: Uint8Array, filename: string): void {
    const base64 = Buffer.from(pdfData).toString('base64');
    this.contentEl.createEl('object', {
      attr: {
        data: `data:application/pdf;base64,${base64}`,
        name: filename,
        type: 'application/pdf',
        width: '100%',
        height: '100%',
      },
    });
  }

  private calculateCurrentPageFromScroll(): number {
    if (!this.viewerAreaEl) return 1;

    const scrollTop = this.viewerAreaEl.scrollTop;
    const pageElements = this.viewerAreaEl.querySelectorAll('.typstmate-pdf-page');

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
    try {
      container.empty();

      for (let pageNumber = 1; pageNumber <= this.pdfDocument.numPages; pageNumber++) {
        const pageDiv = container.createDiv('typstmate-pdf-page');
        pageDiv.id = `pdf-page-${pageNumber}`;

        const page = await this.pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: this.viewerState.scale });

        // キャンバスを作成
        const canvas = pageDiv.createEl('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) continue;

        // 画質を設定
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // テキストレイヤーを作成
        await this.renderTextLayer(page, pageDiv, viewport);
      }
    } catch (error) {
      console.error('Failed to render all PDF pages:', error);
    }
  }

  // TypstTextView から呼ばれる
  async updatePDF(pdfData: Uint8Array, _diags?: any[]): Promise<void> {
    if (!window.pdfjsLib) await loadPdfJs();

    const currentScrollTop = this.viewerAreaEl?.scrollTop || 0;
    const currentPage = this.calculateCurrentPageFromScroll();
    const currentScale = this.viewerState.scale;

    try {
      this.pdfBinary = pdfData;

      // ビューが未初期化の場合は初回レンダリング
      if (!this.pageContainerEl || !this.viewerAreaEl) {
        await this.renderPDF(pdfData, 'preview');
        return;
      }

      const loadingTask = window.pdfjsLib!.getDocument(new Uint8Array(pdfData));
      this.pdfDocument = await loadingTask.promise;

      const newPageContainer = document.createElement('div');
      newPageContainer.className = 'typstmate-pdf-page-container';
      await this.renderAllPagesToContainer(newPageContainer);

      this.pageContainerEl.replaceWith(newPageContainer);
      this.pageContainerEl = newPageContainer;

      this.viewerState.scale = currentScale;
      this.viewerState.scrollTop = currentScrollTop;
      this.viewerState.currentPage = currentPage;

      this.updateControls();
      this.viewerAreaEl.scrollTop = currentScrollTop;
    } catch (e) {
      console.error('[TypstMate] PDF updatePDF failed:', e);
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
