import {
  $,
  appUtils,
  type MarkdownProcessor,
  type Processor,
  type ProcessorKind,
  RenderingEngine,
  settingsManager,
} from '@/libs';
import { DEFAULT_SETTINGS } from '@/settings';
import type { NPath } from '@/types/obsidian';
import type TypstElement from '@/ui/elements/Typst';
import { TypstFileView, TypstPreviewView } from '@/ui/views';
import { extarctCMMath, normalizeDisplayMathCode } from '../utils';

// * ヘルパー関数（個別エクスポート）

/** math コード文字列から使用するプロセッサーを取得する */
export function getMathProcessor(code: string, isDisplay: boolean) {
  return extarctCMMath(code, isDisplay);
}

/** コードブロック種別 id からプロセッサーを取得する */
export function getCodeblockProcessor(id: string): MarkdownProcessor {
  const { settings } = settingsManager;
  return (
    settings.processors.codeblock?.find((p) => p.id === id) ??
    settings.processors.codeblock?.at(-1) ??
    DEFAULT_SETTINGS.processors.codeblock!.at(-1)!
  );
}

/** CM 数式デリミタとプロセッサー prefix を除いた生コードを返す */
export function extractMathCode(raw: string, eqStart: number, eqEnd: number, isDisplay: boolean): string {
  const code = eqEnd !== 0 ? raw.slice(eqStart, -eqEnd) : raw.slice(eqStart);
  return isDisplay ? normalizeDisplayMathCode(code) : code;
}

// * RenderManager

export class RenderManager {
  /** ちらつき防止用の直前レンダリング情報 */
  beforeKind?: ProcessorKind;
  beforeProcessor?: Processor;
  beforeElement?: HTMLElement;

  /** アクティブな ResizeObserver を追跡してデタッチ時に全解除 */
  private observers = new Set<ResizeObserver>();

  init() {}

  // * 数式レンダリング

  renderMath(raw: string, containerEl: Element, isDisplay: boolean, ndir: NPath, npath?: NPath): HTMLElement {
    this.syncMetadata(npath);

    const { eqStart, eqEnd, processor } = getMathProcessor(raw, isDisplay);
    let code = extractMathCode(raw, eqStart, eqEnd, isDisplay);

    if (processor.renderingEngine === 'mathjax') {
      const { settings } = settingsManager;
      if (settings.applyProcessorToMathJax) code = processor.format.replace('{CODE}', code);
      return MathJax.tex2chtml!(code, { display: isDisplay });
    }

    const kind: ProcessorKind = isDisplay ? 'display' : 'inline';
    containerEl.addClass(`typstmate-${kind}`, `typstmate-style-${processor.styling}`, `typstmate-id-${processor.id}`);

    const typstEl = this.createTypstEl(kind, code, processor as MarkdownProcessor, ndir, npath);

    // ちらつき防止
    if (this.beforeElement && this.beforeKind === kind && this.beforeProcessor?.id === processor.id)
      typstEl.replaceChildren(this.beforeElement.cloneNode(true));

    containerEl.appendChild(typstEl);
    settingsManager.settings.enableBackgroundRendering ? typstEl.render() : typstEl.renderSync();

    this.beforeKind = kind;
    this.beforeProcessor = processor;
    this.beforeElement = typstEl;

    // display のとき幅変化で再レンダリング
    if (isDisplay) this.attachResizeObserver(containerEl as HTMLElement, typstEl);

    return containerEl as HTMLElement;
  }

  // * コードブロックレンダリング

  renderCodeblock(source: string, containerEl: Element, id: string, ndir: NPath, npath?: NPath): HTMLElement {
    this.syncMetadata(npath);

    const processor = getCodeblockProcessor(id);

    if (processor?.styling === 'codeblock') {
      containerEl.addClass('HyperMD-codeblock', 'HyperMD-codeblock-bg');
      containerEl = containerEl.createEl('code');
    }

    containerEl.addClass(`typstmate-codeblock`, `typstmate-style-${processor.styling}`, `typstmate-id-${processor.id}`);

    const typstEl = this.createTypstEl('codeblock', source, processor, ndir, npath);
    containerEl.appendChild(typstEl);
    settingsManager.settings.enableBackgroundRendering ? typstEl.render() : typstEl.renderSync();

    this.attachResizeObserver(containerEl as HTMLElement, typstEl);

    return containerEl as HTMLElement;
  }

  // * 共通

  private createTypstEl(
    kind: ProcessorKind,
    code: string,
    processor: MarkdownProcessor,
    ndir: NPath,
    npath?: NPath,
  ): TypstElement {
    const tagName = processor.renderingEngine === RenderingEngine.TypstHTML ? 'typstmate-html' : 'typstmate-svg';
    const typstEl = document.createElement(tagName) as TypstElement;
    typstEl.kind = kind;
    typstEl.source = code;
    typstEl.processor = processor;
    typstEl.ndir = ndir;
    typstEl.npath = npath;
    return typstEl;
  }

  private syncMetadata(npath?: NPath) {
    if (npath) {
      const metadata = appUtils.app.metadataCache.getCache(npath);
      if (metadata) this.metadataManager.syncFileCache(npath, metadata);
    } else {
      this.metadataManager.reset();
    }
  }

  /**
   * Live プロファイル時のみ ResizeObserver を付ける。
   * 要素が DOM から切り離されたら自動解除。
   */
  private attachResizeObserver(containerEl: HTMLElement, typstEl: TypstElement) {
    if (settingsManager.settings.fitToNoteWidthProfile !== 'Live') return;

    const elRef = new WeakRef(containerEl);
    const typstRef = new WeakRef(typstEl);

    const observer = new ResizeObserver(() => {
      const el = elRef.deref();
      const tEl = typstRef.deref();

      if (!el || !tEl || !el.isConnected) {
        observer.disconnect();
        this.observers.delete(observer);
        return;
      }

      const width = el.clientWidth;
      if (width === 0) return;

      $.wasm.setViewportWidth(`${Math.round(width * 0.75)}pt`);
      $.wasm.updateVariables();
      tEl.render();
    });

    observer.observe(containerEl);
    this.observers.add(observer);
  }

  // * ページ全体の再レンダリング

  async renderPendingElements() {
    const waitingElements = document.querySelectorAll('.typstmate-pending');
    for (const el of waitingElements) {
      const content = el.textContent!;
      const file = appUtils.app.workspace.getActiveFile();
      const ndir = file?.parent?.path ?? '/';
      const npath = file?.path;
      el.empty();
      this.renderMath(content, el, el.getAttribute('kind') === 'display', ndir, npath);
    }
  }

  async rerenderAll(elOnly = false) {
    const els = document.querySelectorAll('typstmate-svg, typstmate-html') as NodeListOf<TypstElement>;
    for (const el of els) await el.render();
    if (elOnly) return;

    for (const leaf of appUtils.app.workspace.getLeavesOfType(TypstFileView.viewtype))
      (leaf.view as TypstFileView).debouncedCompile();

    for (const leaf of appUtils.app.workspace.getLeavesOfType(TypstPreviewView.viewtype)) {
      const view = leaf.view as TypstPreviewView;
      if (view.file) view.onModify(view.file);
    }
  }

  disposeObservers() {
    for (const obs of this.observers) obs.disconnect();
    this.observers.clear();
    this.beforeElement = undefined;
  }
}

export const renderManager = new RenderManager();
