import { proxy, type Remote, wrap } from 'comlink';
import * as Obsidian from 'obsidian';
import { type CachedMetadata, getAllTags, MarkdownPreviewRenderer, Notice, requestUrl, type TFile } from 'obsidian';
import { Status, TypstMate } from '@/api';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { DEFAULT_SETTINGS, type Settings } from '@/data/settings';
import { t } from '@/i18n';
import { crashTracker, fileManager, settingsManager } from '@/libs';
import { features, fs, path } from '@/libs/features';
import { type Processor, type ProcessorKind, RenderingEngine } from '@/libs/processor';
import type ObsidianTypstMate from '@/main';
import type { PackageAsset } from '@/types/global';
import type { Singleton } from '@/types/singleton';
import TypstHTMLElement from '@/ui/elements/HTML';
import TypstSVGElement from '@/ui/elements/SVG';
import type TypstElement from '@/ui/elements/Typst';
import type { TypstFileView, TypstPreviewView } from '@/ui/views';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { expandHierarchicalTags } from '@/utils/tags';
import type WasmAdapter from './worker';
import Wasm, { ErrorCode } from './worker';
import WasmWorker from './worker?worker&inline';

import './index.css';

const re = /\n([ \t]*> )/g;

export class TypstManager implements Singleton {
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
    this.ready = false;
    this.updateNoteWidth();
  }

  async prepareWasm() {
    crashTracker.updateCrashStatus(true);

    const adapter = this.plugin.app.vault.adapter;

    const main = {
      notice(message: string, duration?: number) {
        new Notice(message, duration);
      },

      readBinary: async (p: string) => {
        if (features.node && path?.isAbsolute(p)) {
          if (fs) return (await fs.promises.readFile(p)).buffer as ArrayBuffer;
        }
        return await adapter.readBinary(p);
      },

      async writePackage(path: string, files: PackageAsset) {
        await fileManager.writePackage(path, files);
      },

      /**
       * @see https://github.com/typst/typst/blob/main/crates/typst-kit/src/packages.rs
       */
      async fetchPackage(pkgKey: string): Promise<ArrayBuffer> {
        const [namespace, name, version] = pkgKey.split('/');

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

      updateStatus: (status: { isRendering: boolean; path?: string }) => {
        if (this.renderTimer) clearTimeout(this.renderTimer);

        if (status.isRendering) TypstMate.update(undefined, { ...TypstMate.rendering, ...status });
        else {
          this.renderTimer = setTimeout(() => {
            this.renderTimer = undefined;
            TypstMate.update(undefined, { ...TypstMate.rendering, isRendering: false });
          }, 250);
        }
      },

      callObsidian: (name: string, args: any[] | null) => {
        const parts = name.split('.');
        let target: any = null;
        let parent: any = null;

        // Determine starting root
        if (parts[0] === 'app') {
          target = this.plugin.app;
          parts.shift();
        } else if (parts[0] && parts[0] in Obsidian) {
          target = Obsidian;
        } else if (parts[0] && parts[0] in this.plugin.app) {
          target = this.plugin.app;
        } else {
          target = Obsidian;
        }

        // Traverse remaining path
        for (const part of parts) {
          parent = target;
          if (target && part in target) {
            target = target[part];
          } else {
            return undefined;
          }
        }

        let result: any;
        if (args === null) {
          // Raw getter
          result = target;
        } else if (typeof target === 'function') {
          // Method call
          result = target.apply(parent, args);
        } else {
          // Property access with (unexpected) args
          result = target;
        }

        // Final serialization check for Comlink boundary
        if (typeof result === 'function') {
          return '<function>';
        }

        return result;
      },
    };

    const { settings } = settingsManager;

    TypstMate.update(Status.InitializingWasm);

    if (settings.enableBackgroundRendering) {
      this.worker = new WasmWorker();

      const remote = wrap<typeof WasmAdapter>(this.worker);
      this.wasm = await new remote(fileManager.packagesDirPaths, fileManager.baseDirPath, features.node);
      await this.wasm.setMain(proxy(main));
    } else {
      this.wasm = new Wasm(fileManager.packagesDirPaths, fileManager.baseDirPath, features.node);
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
    try {
      TypstMate.update(Status.PreparingAssets);
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

      const sources: Map<string, Uint8Array> = new Map();

      const files = await this.collectTagFiles();

      const result = this.wasm.store({
        fonts,
        sources,
        files,
      });
      if (result instanceof Promise) {
        result.then(() => {
          this.ready = true;
          TypstMate.update(Status.Ready);
          crashTracker.updateCrashStatus(false);

          const waitingElements = document.querySelectorAll('.typstmate-waiting');
          for (const el of waitingElements) {
            const content = el.textContent!;

            const file = this.plugin.app.workspace.getActiveFile();
            const ndir = file?.parent ? ctxToNDir(file.path) : '/';
            const npath = file?.path;

            el.empty();
            this.render(content, el, el.getAttribute('kind')!, ndir, npath);
          }
        });
      } else {
        this.ready = true;
        TypstMate.update(Status.Ready);
        crashTracker.updateCrashStatus(false);
      }
    } catch (e) {
      TypstMate.update(Status.Error);
      throw e;
    }
  }

  registerOnce() {
    overwriteCustomElements('typstmate-svg', TypstSVGElement);
    overwriteCustomElements('typstmate-html', TypstHTMLElement);

    this.registerCodeblockProcessors();

    for (const lang of ['typ', 'typc', 'typm']) {
      this.plugin.registerMarkdownCodeBlockProcessor(`typstmate-${lang}`, async (source, el, ctx) => {
        const npath = ctx.sourcePath;

        try {
          const result = await this.wasm.htmlAsync(
            `\`\`\`${lang}\n${source}\n\`\`\``,
            npath,
            'codeblock',
            `typstmate-${lang}`,
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

        const npath = ctx.sourcePath;
        const ndir = ctxToNDir(npath);

        // TODO
        if (!this.ready) {
          container.textContent = text;
          container.addClass('typstmate-waiting');
          container.setAttribute('kind', inline ? 'inline' : 'display');
        } else mel.replaceChildren(this.render(text, container, inline ? 'inline' : 'display', ndir, npath));

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
      const ndir = file?.parent ? ctxToNDir(file.path) : '/';
      const npath = file?.path;

      return this.render(e, container, r.display ? 'display' : 'inline', ndir, npath);
    };
  }

  // TODO
  registerCodeblockProcessors() {
    for (const id of this.registeredCodeblockProcessorIds) MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.clear();

    for (const processor of settingsManager.settings.processor.codeblock?.processors ?? []) {
      try {
        this.plugin.registerMarkdownCodeBlockProcessor(processor.id, (source, el, ctx) => {
          if (!this.ready) {
            el.textContent = source;
            el.addClass('typstmate-waiting');
            el.setAttribute('kind', processor.id);

            return Promise.resolve(el as HTMLElement);
          }

          const npath = ctx.sourcePath;
          const ndir = ctxToNDir(npath);

          return Promise.resolve(this.render(source, el, processor.id, ndir, npath));
        });

        this.registeredCodeblockProcessorIds.add(processor.id);
      } catch {
        new Notice(t('notices.alreadyRegisteredCodeblock', { id: processor.id }));
      }
    }
  }

  rerenderAll() {
    const svgs = document.querySelectorAll('typstmate-svg, typstmate-html') as NodeListOf<TypstElement>;
    for (const svg of svgs) svg.render();

    for (const leaf of this.plugin.app.workspace.getLeavesOfType('typst-file')) {
      const view = leaf.view as TypstFileView;
      view.debouncedCompile();
    }

    for (const leaf of this.plugin.app.workspace.getLeavesOfType('typst-preview')) {
      const view = leaf.view as TypstPreviewView;
      if (view.file) view.onModify(view.file);
    }
  }

  render(code: string, containerEl: Element, kind: string, ndir: string, npath?: string): HTMLElement {
    if (npath) {
      const cache = this.plugin.app.metadataCache.getCache(npath);
      if (cache) {
        if ((kind === 'inline' || kind === 'display') && cache?.frontmatter?.['math-engine'] === 'mathjax')
          return TypstMate.tex2chtml!(code, {
            display: kind !== 'inline',
          });
        this.syncFileCache(cache);
      }
    } else {
      this.lastStateHash = '';
      this.preamble = '';
    }

    const { settings } = settingsManager;

    // プロセッサーを決定
    let processor: Processor;

    switch (kind) {
      case 'inline':
      case 'display': {
        const { eqStart, eqEnd, processor: processor_ } = extarctCMMath(settings, code, kind === 'display');
        if (eqEnd !== 0) code = code.slice(eqStart, -eqEnd);
        else code = code.slice(eqStart);
        processor = processor_;

        break;
      }
      default:
        processor =
          settings.processor.codeblock?.processors.find((p) => p.id === kind) ??
          settings.processor.codeblock?.processors.at(-1) ??
          DEFAULT_SETTINGS.processor.codeblock!.processors.at(-1)!;

        if (processor.styling === 'codeblock') {
          containerEl.addClass('HyperMD-codeblock', 'HyperMD-codeblock-bg');
          containerEl = containerEl.createEl('code');
        }

        kind = 'codeblock';
    }
    this.beforeProcessor = processor;
    if (processor.renderingEngine === 'mathjax') {
      if (settings.applyProcessorToMathJax) code = processor.format.replace('{CODE}', code);
      return TypstMate.tex2chtml!(code, {
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

    typstEl.render();

    this.beforeElement = typstEl;
    return containerEl as HTMLElement;
  }

  async collectTagFiles() {
    const files: Map<string, string> = new Map();
    const { settings } = settingsManager;
    if (!settings.importPath) return files;

    const importPath = settings.importPath;
    if (!(await this.plugin.app.vault.adapter.exists(importPath))) return files;

    const filePaths = await this.plugin.app.vault.adapter.list(importPath);

    // Import dependency files
    for (const file of filePaths.files) {
      if (!file.endsWith('.typ')) continue;

      const contents = await this.plugin.app.vault.adapter.read(file);
      files.set(`/${file}`, contents);
    }

    const tags = `${importPath}/tags`;
    if (!filePaths.folders.contains(tags)) return files;

    const list = await this.plugin.app.vault.adapter.list(tags);
    for (const file of list.files) {
      if (!file.endsWith('.typ')) continue;

      const contents = await this.plugin.app.vault.adapter.read(file);
      files.set(`/${file}`, contents);

      // The name so far will be something like tags/tag.subtag.subsub.typ
      // So we remove the folder and the .typ then get the tag back
      this.tagFiles.add(
        file
          .slice(importPath.length + 1) // importPath + "/" の分
          .slice(5) // "tags/" の分
          .slice(0, -4) // ".typ" の分
          .replaceAll('.', '/'),
      );
    }

    return files;
  }

  syncFileCache(cache: CachedMetadata): boolean {
    const imports: string[] = cache.frontmatter?.imports ?? [];
    const definitions: string[] = cache.frontmatter?.definitions ?? [];
    const tags: string[] = [];
    for (const tag of expandHierarchicalTags(getAllTags(cache) ?? [])) if (this.tagFiles.has(tag)) tags.push(tag);

    const currentHash = JSON.stringify([tags, imports, definitions]);
    if (currentHash === this.lastStateHash) return false;
    this.lastStateHash = currentHash;

    this.preamble = '';
    const { settings } = settingsManager;
    for (const tag of tags)
      this.preamble += `#import "${fileManager.baseDirPath}/${settings.importPath}/tags/${tag.replaceAll('/', '.')}.typ": *;`;
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

  async refreshWasm() {
    await this.wasm.free();
    await this.wasm.clearCache();
    this.worker?.terminate();
    this.worker = undefined;

    await this.prepareWasm();
    await this.prepareAssets();
    this.rerenderAll();
  }

  async detach() {
    (this as any).plugin = undefined;
    await this.wasm.free();
    this.worker?.terminate();
    this.beforeElement = undefined;
  }
}

export const typstManager = new TypstManager();

/**
 * CMMath は, `({} )(id)(Inline Processor における区切り文字 :)(数式)( {})` の形式をとる
 */
export const extarctCMMath = (settings: Settings, code: string, display: boolean) => {
  /** {}, id, : を含まない */
  let eqStart = 0;
  /** {} を含まない */
  let eqEnd = 0;

  let processor: Processor;
  if (display) {
    // Display
    code = code.replaceAll('<br>', '​​​​'); // ? 文字の長さを合わせる
    code = code.replace(re, (_, s) => `\n${'​'.repeat(s.length)}`); // ? 文字の長さを合わせる

    // プロセッサー選択
    const processors = settings.processor.display?.processors;
    processor =
      processors?.find((p) => code.startsWith(p.id)) ??
      processors?.at(-1) ??
      DEFAULT_SETTINGS.processor.display!.processors.at(-1)!;
    if (processor.id.length > 0) eqStart += processor.id.length;
  } else {
    // Inline
    if (code.startsWith('{}')) {
      if (code.startsWith('{} ')) eqStart += 3;
      else eqStart += 2;
    }
    if (code.endsWith('{}')) {
      if (code.endsWith(' {}')) eqEnd += 3;
      else eqEnd += 2;
    }

    // プロセッサー選択
    code = code.slice(eqStart);
    const processors = settings.processor.inline?.processors;
    processor =
      processors?.find((p) => code.startsWith(`${p.id}:`)) ??
      processors.at(-1) ??
      DEFAULT_SETTINGS.processor.inline!.processors.at(-1)!;
    if (processor.id.length > 0) eqStart += processor.id.length + 1; // ? : の分
  }

  return { eqStart, eqEnd, processor };
};

export function getNdirAndNPath(file: TFile | null): { ndir: string; npath?: string } {
  return { ndir: file?.parent ? ctxToNDir(file.path) : '/', npath: file?.path };
}

export function ctxToNDir(s: string): string {
  const i = s.lastIndexOf('/');
  return i === -1 ? '/' : `/${s.slice(0, i + 1)}`;
}
