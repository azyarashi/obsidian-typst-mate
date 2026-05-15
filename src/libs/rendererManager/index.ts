import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { $ as wasmManager } from '../wasmManager';
import { metadataManager } from './metadata/metadataManager';
import { renderManager } from './render/renderManager';
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
export { metadataManager, renderManager, variablesManager };

import './index.css';
import TypstHTMLElement from './elements/HTML';
import TypstSVGElement from './elements/SVG';
export class RendererManager implements Singleton {
  plugin: ObsidianTypstMate | undefined;

  typ2chtml: (math: string, options?: Typ2chtmlOptions) => HTMLElement = typ2chtmlBeforeReady;
  markdownMathPostProcessor: (el: HTMLElement, ctx: any) => void = markdownProcessorBeforeReady;

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;

    wasmManager.init(plugin);
    metadataManager.init(plugin);
    renderManager.init();
    variablesManager.init(plugin);
    variablesManager.setOnRerender(() => renderManager.rerenderAll());
  }

  async prepareWasm() {
    return wasmManager.prepareWasmAdapter();
  }

  async prepareAssets() {
    const files = await metadataManager.collectTagFiles();
    await wasmManager.prepareAssets(files);
    this.swapToReady();
  }

  async refreshWasm() {
    this.swapToBeforeReady();
    renderManager.disposeObservers();
    const files = await metadataManager.collectTagFiles();
    await wasmManager.refreshWasm(files);
    this.swapToReady();
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
    hookDecorationForPatchingMathWidget(plugin);

    // MarkdownPreviewView
    // ? Obsidian における `MarkdownPreviewView` が数式をレンダリングする際, `.math:not(.is-loaded)` を処理しようとする
    // ? `sortOrder: -1` で先に `.is-loaded` を付与することでその処理を回避する
    plugin!.registerMarkdownPostProcessor((el, ctx) => this.markdownMathPostProcessor(el, ctx), -1);
  }

  async detach() {
    (this as any).plugin = undefined;
    renderManager.disposeObservers();
    await wasmManager.clearWasm();
  }
}

export const rendererManager = new RendererManager();
