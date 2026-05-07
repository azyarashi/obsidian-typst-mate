import type { PackageSpec } from '@wasm';
import { proxy, type Remote, wrap } from 'comlink';
import { type CachedMetadata, getAllTags, MarkdownPreviewRenderer, Notice, requestUrl } from 'obsidian';
import { Phase, State, TypstMate } from '@/api';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { crashTracker, fileManager, settingsManager } from '@/libs';
import { features } from '@/libs/features';
import { t } from '@/libs/i18n';
import type ObsidianTypstMate from '@/main';
import type { NPath } from '@/types/obsidian';
import type { Singleton } from '@/types/singleton';
import TypstHTMLElement from '@/ui/elements/HTML';
import TypstSVGElement from '@/ui/elements/SVG';
import type TypstElement from '@/ui/elements/Typst';
import { TypstFileView, type TypstPreviewView } from '@/ui/views';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { expandHierarchicalTags } from '@/utils/tags';
import {
  type CodeblockProcessor,
  extarctCMMath,
  getNDirAndNPath,
  getParentNPathByFileNPath,
  type MarkdownProcessor,
  type Processor,
  type ProcessorKind,
  RenderingEngine,
  sanitizeDisplayMathCode,
} from './utils';
import type WasmAdapter from './worker';
import Wasm, { ErrorCode } from './worker';
import WasmWorker from './worker?worker&inline';

export * from './utils';

import './index.css';
import type { PackageAsset } from '@/types/typst';

// TODO runtime errror の誘導

export class RendererManager implements Singleton {
  plugin!: ObsidianTypstMate;
  ready = false;

  wasm!: WasmAdapter | Remote<WasmAdapter>;
  private worker?: Worker;
  private renderTimer?: ReturnType<typeof setTimeout>;

  registeredCodeblockProcessorIds: Set<string> = new Set();

  beforeKind?: ProcessorKind;
  beforeProcessor?: Processor;
  beforeElement?: HTMLElement;

  lastStateHash?: string;
  tagFiles: Set<string> = new Set();
  currentNoteWidth?: string;

  preamble: string = '';

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  async prepareWasm() {
    const { settings } = settingsManager;
    const { adapter } = this.plugin.app.vault;

    const main = {
      notice(message: string, duration?: number) {
        new Notice(message, duration);
      },

      async readBinary(p: string) {
        return await adapter.readBinary(p);
      },

      async writePackage(spec: PackageSpec, files: PackageAsset) {
        await fileManager.writePackage(spec, files);
      },

      /**
       * @see https://github.com/typst/typst/blob/main/crates/typst-kit/src/packages.rs
       */
      async fetchPackage(spec: PackageSpec): Promise<ArrayBuffer> {
        const { namespace, name, version } = spec;
        if (namespace !== 'preview') throw ErrorCode.PackageErrorNotFound;

        const res = await requestUrl({
          url: `https://packages.typst.org/${namespace}/${name}-${version}.tar.gz`,
          method: 'GET',
          throw: false,
        });

        if (res.status === 404) throw ErrorCode.PackageErrorNotFound;
        if (res.status !== 200) throw ErrorCode.PackageErrorNetworkFailed;

        return res.arrayBuffer;
      },

      updateStatus: (status: { isRendering: boolean; message?: string }) => {
        if (this.renderTimer) clearTimeout(this.renderTimer);

        if (status.isRendering) TypstMate.setStatus({ state: State.Rendering, message: status.message });
        else {
          this.renderTimer = setTimeout(() => {
            this.renderTimer = undefined;
            TypstMate.setStatus({ state: State.Idle });
          }, 250);
        }
      },
    };

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

    await this.wasm.init(
      await this.plugin.app.vault.adapter.readBinary(fileManager.wasmNPath),
      this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE,
      settings.offset,
    );

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
    TypstMate.setPhase(Phase.Ready);
    crashTracker.updateCrashStatus(false);

    const waitingElements = document.querySelectorAll('.typstmate-waiting');
    for (const el of waitingElements) {
      const content = el.textContent!;

      const file = this.plugin.app.workspace.getActiveFile();
      const ndir = file?.parent?.path ?? '/';
      const npath = file?.path;

      el.empty();
      this.render(content, el, el.getAttribute('kind')!, ndir, npath);
    }
  }

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
          container.addClass('typstmate-waiting');
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
    window.MathJax!.tex2chtml = (e: string, r: { display?: boolean }) => {
      // タグ名，クラス名，属性がこれ以外だと認識されないない
      const container = document.createElement('mjx-container');
      container.className = 'Mathjax';
      container.setAttribute('jax', 'CHTML');

      if (!this.ready) {
        container.textContent = e;
        container.addClass('typstmate-waiting');
        container.setAttribute('kind', r.display ? 'display' : 'inline');

        return container;
      }

      const file = this.plugin.app.workspace.getActiveFile();
      const { ndir, npath } = getNDirAndNPath(file);

      return this.render(e, container, r.display ? 'display' : 'inline', ndir, npath);
    };
  }

  // TODO
  registerCodeblockProcessors() {
    // MarkdownPreviewRenderer.codeBlockPostProcessors
    for (const id of this.registeredCodeblockProcessorIds) MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.clear();

    const codeblockProcessors = settingsManager.settings.processor.codeblock.processors;
    for (const processor of codeblockProcessors) this.registerCodeblockProcessor(processor);
  }

  registerCodeblockProcessor(processor: CodeblockProcessor) {
    try {
      this.plugin.registerMarkdownCodeBlockProcessor(processor.id, (source, el, ctx) => {
        if (!this.ready) {
          el.textContent = source;
          el.addClass('typstmate-waiting');
          el.setAttribute('kind', processor.id);

          return Promise.resolve(el as HTMLElement);
        }

        const npath = ctx.sourcePath;
        const ndir = getParentNPathByFileNPath(npath);

        return Promise.resolve(this.render(source, el, processor.id, ndir, npath));
      });

      this.registeredCodeblockProcessorIds.add(processor.id);
    } catch {
      new Notice(t('notices.alreadyRegisteredCodeblock', { id: processor.id }));
    }
  }

  unregisterCodeblockProcessor(id: string) {
    MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.delete(id);
  }

  renameCodeblockProcessor(oldId: string, newProcessor: CodeblockProcessor) {
    this.unregisterCodeblockProcessor(oldId);
    this.registerCodeblockProcessor(newProcessor);
  }

  async rerenderAll(elOnly = false) {
    const els = document.querySelectorAll('typstmate-svg, typstmate-html') as NodeListOf<TypstElement>;
    for (const el of els) await el.render();
    if (elOnly) return;

    for (const leaf of this.plugin.app.workspace.getLeavesOfType(TypstFileView.viewtype)) {
      const view = leaf.view as TypstFileView;
      view.debouncedCompile();
    }

    for (const leaf of this.plugin.app.workspace.getLeavesOfType('typst-preview')) {
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
        if (isDisplay) code = sanitizeDisplayMathCode(code);

        break;
      }
      default: {
        // * codeblock
        processor =
          settings.processor.codeblock?.processors.find((p) => p.id === kind) ??
          settings.processor.codeblock?.processors.at(-1) ??
          DEFAULT_SETTINGS.processor.codeblock!.processors.at(-1)!;

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

  updateNoteWidth() {
    const profileName = settingsManager.settings.fitToNoteWidthProfile;
    if (profileName !== 'Live') {
      const profile = settingsManager.settings.fitToNoteWidthProfiles.find((p) => p.name === profileName);
      if (!profile) return;

      this.currentNoteWidth = profile.width;
      return;
    }
    this.currentNoteWidth = undefined;
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

  async detach() {
    (this as any).plugin = undefined;
    this.beforeElement = undefined;

    await this.clearWasm();
  }
}

export const rendererManager = new RendererManager();
