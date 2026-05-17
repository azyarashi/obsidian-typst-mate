import {
  appUtils,
  type MarkdownProcessor,
  type Processor,
  type ProcessorKind,
  RenderingEngine,
  settingsManager,
} from '@/libs';
import type ObsidianTypstMate from '@/main';
import type { NPath } from '@/types/obsidian';
import type { Singleton } from '@/types/singleton';
import { TypstFileView, TypstPreviewView } from '@/ui/views';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { $ as wasmManager } from '../wasmManager';
import TypstHTMLElement from './elements/HTML';
import TypstSVGElement from './elements/SVG';
import type TypstElement from './elements/Typst';
import { metadataManager } from './metadata/metadataManager';
import { extractMathCode, getCodeblockProcessor, getMathProcessor } from './utils';
import { variablesManager } from './variables/variablesManager';
import { hookDecorationForPatchingMathWidget } from './views/edit';
import {
  flushPendings,
  markdownProcessor,
  markdownProcessorBeforeReady,
  type Typ2chtmlOptions,
  typ2chtml,
  typ2chtmlBeforeReady,
} from './views/render';

export * from './utils';
export { metadataManager, variablesManager };

import './index.css';

export class RendererManager implements Singleton {
  plugin: ObsidianTypstMate | undefined;

  /** ちらつき防止用の直前レンダリング情報 */
  beforeKind?: ProcessorKind;
  beforeProcessor?: Processor;
  beforeElement?: HTMLElement;

  /** アクティブな ResizeObserver を追跡してデタッチ時に全解除 */
  private observers = new Set<ResizeObserver>();

  typ2chtml: (math: string, options?: Typ2chtmlOptions) => HTMLElement = typ2chtmlBeforeReady;
  markdownMathPostProcessor: (el: HTMLElement, ctx: any) => void = markdownProcessorBeforeReady;

  init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  async onLayoutReady() {
    const plugin = this.plugin!;
    metadataManager.init(plugin);
    variablesManager.init(plugin);
    variablesManager.setOnRerender(() => this.rerenderAll());

    const files = await metadataManager.collectTagFiles();
    await wasmManager.prepareAssets(files);
    this.swapToReady();
    this.renderPendingElements();
  }

  async refresh() {
    this.swapToBeforeReady();
    this.disposeObservers();
    const files = await metadataManager.collectTagFiles();
    await wasmManager.refreshWasm(files);
    this.swapToReady();
    this.renderPendingElements();
  }

  private swapToReady() {
    this.typ2chtml = typ2chtml;
    this.markdownMathPostProcessor = markdownProcessor;
    flushPendings(typ2chtml);
  }

  private swapToBeforeReady() {
    this.typ2chtml = typ2chtmlBeforeReady;
    this.markdownMathPostProcessor = markdownProcessorBeforeReady;
  }

  registerOnce(plugin: ObsidianTypstMate) {
    overwriteCustomElements('typstmate-svg', TypstSVGElement);
    overwriteCustomElements('typstmate-html', TypstHTMLElement);

    // MarkdownEditView
    hookDecorationForPatchingMathWidget(plugin, this);

    // MarkdownPreviewView
    plugin.registerMarkdownPostProcessor((el, ctx) => this.markdownMathPostProcessor(el, ctx), -1);
  }

  async detach() {
    this.plugin = undefined;
    this.disposeObservers();
    await wasmManager.clearWasm();
  }

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
      if (metadata) metadataManager.syncFileCache(npath, metadata);
    } else {
      metadataManager.reset();
    }
  }

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

      wasmManager.wasm?.setViewportWidth(`${Math.round(width * 0.75)}pt`);
      wasmManager.wasm?.updateVariables();
      tEl.render();
    });

    observer.observe(containerEl);
    this.observers.add(observer);
  }

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

  async renderTypstHtml(source: string, containerEl: HTMLElement, ndir: NPath) {
    const processor = getCodeblockProcessor('typ');
    const result = await wasmManager.wasm?.htmlmAsync(ndir, 'codeblock', processor.id, source);
    if (result) containerEl.innerHTML = result.html;
  }

  disposeObservers() {
    for (const obs of this.observers) obs.disconnect();
    this.observers.clear();
    this.beforeElement = undefined;
  }
}

export const rendererManager = new RendererManager();
