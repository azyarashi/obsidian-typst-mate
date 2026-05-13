import { proxy, type Remote, wrap } from 'comlink';
import { type CachedMetadata, getAllTags, MarkdownView, Notice, type TFile } from 'obsidian';
import { TypstMate } from '@/api';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { fileManager, settingsManager } from '@/libs';
import { features } from '@/libs/features';
import { t } from '@/libs/i18n';
import type ObsidianTypstMate from '@/main';
import type { NPath } from '@/types/obsidian';
import type { Singleton } from '@/types/singleton';
import TypstHTMLElement from '@/ui/elements/HTML';
import TypstSVGElement from '@/ui/elements/SVG';
import type TypstElement from '@/ui/elements/Typst';
import { TypstFileView, TypstPreviewView } from '@/ui/views';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { expandHierarchicalTags } from '@/utils/tags';
import { extarctCMMath, getMain, getNDirAndNPath, getParentNPathByFileNPath, normalizeDisplayMathCode } from './utils';
import type WasmAdapter from './worker';
import Wasm from './worker';
import WasmWorker from './worker?worker&inline';

export * from './utils';

import './index.css';

// TODO runtime errror の誘導

export class RendererManager implements Singleton {
  plugin!: ObsidianTypstMate;
  ready = false;

  wasm!: WasmAdapter | Remote<WasmAdapter>;
  private worker?: Worker;

  registeredCodeblockProcessorIds: Set<string> = new Set();

  beforeKind?: ProcessorKind;
  beforeProcessor?: Processor;
  beforeElement?: HTMLElement;

  lastStateHash?: string;
  tagFiles: Set<string> = new Set();

  metadataCache: Map<NPath, CachedMetadata> = new Map();
  frontmatterPreamble: string = '';

  preamble: string = '';

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  // * wasm

  async prepareWasm() {
    const { settings } = settingsManager;
    const main = getMain();

    if (settings.enableBackgroundRendering) {
      this.worker = new WasmWorker();

      const remote = wrap<typeof WasmAdapter>(this.worker);
      this.wasm = await new remote(
        fileManager.baseDirPath,
        fileManager.vaultPackagesDirNPath,
        fileManager.localPackagesDirPaths,
        features,
      );
      await this.wasm.setMain(proxy(main));
    } else {
      this.wasm = new Wasm(
        fileManager.baseDirPath,
        fileManager.vaultPackagesDirNPath,
        fileManager.localPackagesDirPaths,
        features,
      );
      this.wasm.setMain(main);
    }

    await this.wasm.init(await this.plugin.app.vault.adapter.readBinary(fileManager.wasmNPath));
    await this.wasm.setOffset(settings.offset);
    await this.wasm.initInternalPackages(this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE);

    // await this.wasm.initInternalPackages(this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE);

    TypstMate.typstVersion = await this.wasm.version();

    /*if (features.watcher) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      await fileManager.watchPackages((path) => {
        const ext = path.split('.').pop()?.toLowerCase();
        if (!ext || !settings.watcherExtensions.includes(ext)) return;

        this.wasm.clearCache(path);

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.rerenderAll();
        }, 300);
      });
    }*/
  }

  async prepareAssets() {
    const fontPaths = await fileManager.collectFonts();
    const fonts = (
      await Promise.all(
        fontPaths.map((fontPath) =>
          this.plugin.app.vault.adapter.readBinary(fontPath).catch(() => {
            new Notice(t('notices.failedToLoadFont', { name: fontPath.split('/').pop() ?? 'undefined' }));
          }),
        ),
      )
    ).filter((font) => font !== undefined);

    const files = await this.collectTagFiles();

    await this.wasm.store({ fonts, files });

    this.ready = true;
  }

  private async clearWasm() {
    await this.wasm.free();
    await this.wasm.clearCache();
    this.worker?.terminate();
    this.worker = undefined;
  }

  async refreshWasm() {
    await this.clearWasm();

    await this.prepareWasm();
    await this.prepareAssets();
  }

  // * register

  registerOnce() {
    overwriteCustomElements('typstmate-svg', TypstSVGElement);
    overwriteCustomElements('typstmate-html', TypstHTMLElement);

    // TODO
    this.registerCodeblockProcessors();

    // TODO typstmate-example
    for (const lang of ['typ', 'typc', 'typm']) {
      this.plugin.registerMarkdownCodeBlockProcessor(`typstmate-${lang}`, async (source, el, ctx) => {
        const npath = ctx.sourcePath;

        try {
          // TODO
          const result = await this.wasm.htmlmAsync(
            npath,
            'codeblock',
            `typstmate-${lang}`,
            `\`\`\`${lang}\n${source}\n\`\`\``,
          );
          el.addClass('typstmate-codeblock-internal');
          if (result?.html) el.innerHTML = result.html;
          else el.textContent = 'Something went wrong (｡>_<｡)';
        } catch (e) {
          if (Array.isArray(e) && e.length > 0)
            el.textContent = `Typst Render Error: ${e[0].message || JSON.stringify(e[0])}`;
          else el.textContent = `Typst Render Error: ${e}`;
        }
      });
    }

    // Handle embeds separately, since they don't share the same frontmatter
    this.plugin.registerMarkdownPostProcessor((el, ctx) => {
      const isEmbed = ctx.sourcePath !== this.plugin.app.workspace.getActiveFile()?.path;
      if (!isEmbed) return;
      const math = el.querySelectorAll('.math');

      for (const mel of math) {
        const inline = mel.hasClass('math-inline');
        const text = mel.textContent;
        mel.setText('');
        const container = document.createElement('mjx-container');
        container.className = 'Mathjax';
        container.setAttribute('jax', 'CHTML');

        // TODO
        if (!this.ready) {
          container.textContent = text;
          container.addClass('typstmate-pending');
          container.setAttribute('kind', inline ? 'inline' : 'display');
        } else {
          const npath = ctx.sourcePath;
          const ndir = getParentNPathByFileNPath(npath);
          mel.replaceChildren(this.render(text, container, inline ? 'inline' : 'display', ndir, npath));
        }

        mel.setAttribute('contenteditable', 'false');
        mel.addClass('is-loaded');
      }
    }, -100);

    // MathJax をオーバライド
    window.MathJax!.tex2chtml = (e: string, r: { display?: boolean; file?: TFile }) => {
      const { display, file } = r;

      // タグ名，クラス名，属性がこれ以外だと認識されないない
      const container = document.createElement('mjx-container');
      container.className = 'Mathjax';
      container.setAttribute('jax', 'CHTML');

      if (!this.ready) {
        container.textContent = e;
        container.addClass('typstmate-pending');
        container.setAttribute('kind', display ? 'display' : 'inline');

        return container;
      }

      const { ndir, npath } = getNDirAndNPath(file);
      return this.render(e, container, display ? 'display' : 'inline', ndir, npath);
    };
  }

  // * rendering

  async renderPendingElements() {
    const waitingElements = document.querySelectorAll('.typstmate-pending');
    for (const el of waitingElements) {
      const content = el.textContent!;

      // TODO

      const file = this.plugin.app.workspace.getActiveFile();
      const ndir = file?.parent?.path ?? '/';
      const npath = file?.path;

      el.empty();
      this.render(content, el, el.getAttribute('kind')!, ndir, npath);
    }
  }

  async rerenderAll(elOnly = false) {
    // TODO docId
    const els = document.querySelectorAll('typstmate-svg, typstmate-html') as NodeListOf<TypstElement>;
    for (const el of els) await el.render();
    if (elOnly) return;

    for (const leaf of this.plugin.app.workspace.getLeavesOfType(TypstFileView.viewtype)) {
      const view = leaf.view as TypstFileView;
      view.debouncedCompile();
    }

    for (const leaf of this.plugin.app.workspace.getLeavesOfType(TypstPreviewView.viewtype)) {
      const view = leaf.view as TypstPreviewView;
      if (view.file) view.onModify(view.file);
    }
  }

  render(code: string, containerEl: Element, kind: string, ndir: NPath, npath?: NPath): HTMLElement {
    if (npath) {
      const metadata = this.plugin.app.metadataCache.getCache(npath);
      if (metadata) {
        if ((kind === 'inline' || kind === 'display') && metadata?.frontmatter?.['math-engine'] === 'mathjax')
          return TypstMate.tex2chtmlOrig!(code, {
            display: kind !== 'inline',
          });
        this.syncFileCache(metadata);
      }
    } else {
      this.lastStateHash = '';
      this.preamble = '';
    }

    const { settings } = settingsManager;

    // プロセッサーを決定
    let processor: MarkdownProcessor;

    switch (kind) {
      case 'inline':
      case 'display': {
        const isDisplay = kind === 'display';

        const { eqStart, eqEnd, processor: processor_ } = extarctCMMath(code, isDisplay);
        processor = processor_;

        if (eqEnd !== 0) code = code.slice(eqStart, -eqEnd);
        else code = code.slice(eqStart);
        if (isDisplay) code = normalizeDisplayMathCode(code);

        break;
      }
      default: {
        // * codeblock
        processor =
          settings.processors.codeblock?.find((p) => p.id === kind) ??
          settings.processors.codeblock?.at(-1) ??
          DEFAULT_SETTINGS.processors.codeblock!.at(-1)!;

        if (processor?.styling === 'codeblock') {
          containerEl.addClass('HyperMD-codeblock', 'HyperMD-codeblock-bg');
          containerEl = containerEl.createEl('code');
        }

        kind = 'codeblock';
        break;
      }
    }
    this.beforeProcessor = processor;
    if (processor.renderingEngine === 'mathjax') {
      if (settings.applyProcessorToMathJax) code = processor.format.replace('{CODE}', code);
      return TypstMate.tex2chtmlOrig!(code, {
        display: kind !== 'inline',
      });
    }
    containerEl.addClass(`typstmate-${kind}`, `typstmate-style-${processor.styling}`, `typstmate-id-${processor.id}`);

    // レンダリング
    const tagName = processor.renderingEngine === RenderingEngine.TypstHTML ? 'typstmate-html' : 'typstmate-svg';
    const typstEl = document.createElement(tagName) as TypstElement;
    typstEl.kind = kind as ProcessorKind;
    typstEl.source = code;
    typstEl.processor = processor;
    typstEl.ndir = ndir;
    typstEl.npath = npath;
    containerEl.appendChild(typstEl);
    // ちらつき防止
    const { id: beforeId } = this.beforeProcessor;
    if (this.beforeElement && this.beforeKind === kind && beforeId === processor.id)
      typstEl.replaceChildren(this.beforeElement.cloneNode(true));

    settingsManager.settings.enableBackgroundRendering ? typstEl.render() : typstEl.renderSync();

    this.beforeElement = typstEl;
    return containerEl as HTMLElement;
  }

  async collectTagFiles() {
    const files: Map<string, string> = new Map();
    const { settings } = settingsManager;
    if (!settings.resourcesPath) return files;

    const resourcesPath = settings.resourcesPath;
    if (!(await this.plugin.app.vault.adapter.exists(resourcesPath))) return files;

    const filePaths = await this.plugin.app.vault.adapter.list(resourcesPath);

    // Import dependency files
    for (const file of filePaths.files) {
      if (!file.endsWith('.typ')) continue;

      const contents = await this.plugin.app.vault.adapter.read(file);
      files.set(`/${file}`, contents);
    }

    const tagsPath = `${resourcesPath}/tags`;
    if (!filePaths.folders.contains(tagsPath)) return files;

    const list = await this.plugin.app.vault.adapter.list(tagsPath);
    for (const file of list.files) {
      if (!file.endsWith('.typ')) continue;

      const contents = await this.plugin.app.vault.adapter.read(file);
      files.set(`/${file}`, contents);

      // The name so far will be something like tags/tag.subtag.subsub.typ
      // So we remove the folder and the .typ then get the tag back
      this.tagFiles.add(
        file
          .slice(resourcesPath.length + 1) // resourcesPath + "/" の分
          .slice(5) // "tags/" の分
          .slice(0, -4) // ".typ" の分
          .replaceAll('.', '/'),
      );
    }

    return files;
  }

  syncFileCache(metadata: CachedMetadata): boolean {
    const imports: string[] = metadata.frontmatter?.import ?? [];
    const definitions: string[] = metadata.frontmatter?.definitions ?? metadata.frontmatter?.let ?? [];
    const tags: string[] = [];
    for (const tag of expandHierarchicalTags(getAllTags(metadata) ?? [])) if (this.tagFiles.has(tag)) tags.push(tag);

    const currentHash = JSON.stringify([tags, imports, definitions]);
    if (currentHash === this.lastStateHash) return false;
    this.lastStateHash = currentHash;

    this.preamble = '';
    const { settings } = settingsManager;
    for (const tag of tags)
      this.preamble += `#import "${fileManager.baseDirPath}/${settings.resourcesPath}/tags/${tag.replaceAll('/', '.')}.typ": *;`;
    // Frontmatter variable definitions
    for (const i of imports) this.preamble += `#import ${i};`;
    for (const d of definitions) this.preamble += `#let ${d};`;

    return true;
  }

  // * profile

  updateNoteWidth(): boolean {
    switch (settingsManager.settings.fitToNoteWidthProfile) {
      case 'Live':
        return this.updateNoteWidthWithLive();
      default:
        return this.updateNoteWidthWithProfile();
    }
  }

  updateNoteWidthWithProfile(): boolean {
    const profileName = settingsManager.settings.fitToNoteWidthProfile;
    if (profileName !== 'Live') {
      const profile = settingsManager.settings.fitToNoteWidthProfiles.find((p) => p.name === profileName);
      if (!profile) return false;

      const width = profile.width;
      this.wasm.setViewportWidth(width);
      this.wasm.updateVariables();
      return true;
    }

    return false;
  }

  updateNoteWidthWithLive(): boolean {
    if (settingsManager.settings.fitToNoteWidthProfile !== 'Live') return false;

    const width = this.getNoteWidth();
    this.wasm.setViewportWidth(width);
    this.wasm.updateVariables();
    return true;
  }

  getNoteWidth(view?: MarkdownView | null): string {
    view = view ?? this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    let width = Infinity;

    if (view) {
      const sizer = view?.editor.editorComponent?.sizerEl;
      const sizerWidth = sizer?.clientWidth ? sizer.clientWidth : Infinity;

      if (view.getMode() === 'preview') {
        const divElP = view?.contentEl.find('div.el-p p');

        const pWidth = divElP?.clientWidth ? divElP.clientWidth : Infinity;

        width = Math.min(sizerWidth, pWidth);
      } else {
        const cmLine = sizer?.find('.cm-line');
        const cmContent = sizer?.find('.cm-content');

        const lineWidth = cmLine?.clientWidth ? cmLine.clientWidth : Infinity;
        const contentWidth = cmContent?.clientWidth ? cmContent?.clientWidth : Infinity;

        width = Math.min(sizerWidth, lineWidth, contentWidth);
      }
    } else {
      // TODO: キャンバス とか Kanban とか
    }

    const fileLineWidth = parseInt(getComputedStyle(document.body).getPropertyValue('--file-line-width'), 10);
    const typstWidth = (width === Infinity ? (Number.isNaN(fileLineWidth) ? 700 : fileLineWidth) : width) * 0.75;

    return `${typstWidth}pt`;
  }

  // * detach

  async detach() {
    (this as any).plugin = undefined;
    this.beforeElement = undefined;

    await this.clearWasm();
  }
}

export const rendererManager = new RendererManager();
