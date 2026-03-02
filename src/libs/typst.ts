import { type CachedMetadata, getAllTags, MarkdownView, Notice, type TFile } from 'obsidian';

import { DEFAULT_FONT_SIZE } from '@/constants';
import { DEFAULT_SETTINGS, type Settings } from '@/data/settings';
import type ObsidianTypstMate from '@/main';
import TypstSVGElement from '@/ui/elements/SVG';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { unzip, zip } from '@/utils/packageCompressor';
import { expandHierarchicalTags } from '@/utils/tags';

import type { Processor, ProcessorKind } from './processor';
import type { PackageSpec } from './worker';

import './typst.css';

const re = /\n([ \t]*> )/g;

export default class TypstManager {
  plugin: ObsidianTypstMate;
  ready = false;

  beforeKind?: ProcessorKind;
  beforeProcessor?: Processor;
  beforeElement: HTMLElement = document.createElement('span');
  lastStateHash?: string;

  preamble: string = '';
  tagFiles: Set<string> = new Set();

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  async init() {
    this.ready = false;
    this.plugin.updateCrashStatus(true);

    await this.plugin.typst.init(
      await this.plugin.app.vault.adapter.readBinary(this.plugin.wasmPath),
      this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE,
      this.plugin.settings.offset,
    );

    const fontPaths = (await this.plugin.app.vault.adapter.list(this.plugin.fontsDirNPath)).files.filter(
      (file) =>
        file.endsWith('.font') ||
        file.endsWith('.otf') ||
        file.endsWith('.otc') ||
        file.endsWith('.ttf') ||
        file.endsWith('.ttc'),
    );
    const fonts = (
      await Promise.all(
        fontPaths.map((fontPath) =>
          this.plugin.app.vault.adapter.readBinary(fontPath).catch(() => {
            new Notice(`Failed to load font: ${fontPath.split('/').pop()}`);
          }),
        ),
      )
    ).filter((font) => font !== undefined);

    const kind = ['inline', 'display', 'codeblock'];
    if (this.plugin.excalidrawPluginInstalled) kind.push('excalidraw');

    // キャッシュ
    const sources: Map<string, Uint8Array> = new Map();
    if (!this.plugin.settings.disablePackageCache) {
      const cachePaths = (await this.plugin.app.vault.adapter.list(this.plugin.cachesDirNPath)).files.filter((file) =>
        file.endsWith('.cache'),
      );
      for (const cachePath of cachePaths) {
        try {
          const cacheMap = unzip(await this.plugin.app.vault.adapter.readBinary(cachePath));
          for (const [path, data] of cacheMap) sources.set(`@${path}`, new Uint8Array(data!));
        } catch {
          new Notice(`Failed to load cache: ${cachePath.split('/').pop()}`);
        }
      }
    }

    const files = await this.collectTagFiles();

    if (this.plugin.settings.skipPreparationWaiting) {
      const result = this.plugin.typst.store({
        fonts,
        sources,
        files,
      });
      if (result instanceof Promise) {
        result.then(() => {
          this.ready = true;
          this.plugin.updateCrashStatus(false);

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
        this.plugin.updateCrashStatus(false);
      }
    } else {
      await this.plugin.typst.store({ fonts, sources, files });

      this.ready = true;
      this.plugin.updateCrashStatus(false);
    }
  }

  registerOnce() {
    overwriteCustomElements('typstmate-svg', TypstSVGElement);

    // コードブロックプロセッサーをオーバライド
    for (const processor of this.plugin.settings.processor.codeblock?.processors ?? []) {
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
      } catch {
        new Notice(`Already registered codeblock language: ${processor.id}`);
      }
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

        mel.replaceChildren(this.render(text, container, inline ? 'inline' : 'display', ctx.sourcePath));

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

  render(code: string, containerEl: Element, kind: string, ndir: string, npath?: string): HTMLElement {
    if (npath) {
      const cache = this.plugin.app.metadataCache.getCache(npath);
      if (cache) {
        if ((kind === 'inline' || kind === 'display') && cache?.frontmatter?.['math-engine'] === 'mathjax')
          return this.plugin.originalTex2chtml(code, {
            display: kind !== 'inline',
          });
        this.syncFileCache(cache);
      }
    } else this.preamble = '';

    // プロセッサーを決定
    let processor: Processor;
    switch (kind) {
      case 'inline':
      case 'display': {
        const { eqStart, eqEnd, processor: processor_ } = extarctCMMath(this.plugin.settings, code, kind === 'display');
        if (eqEnd !== 0) code = code.slice(eqStart, -eqEnd);
        else code = code.slice(eqStart);
        processor = processor_;

        break;
      }
      case 'excalidraw':
        processor =
          this.plugin.settings.processor.excalidraw?.processors.find((p) => code.startsWith(`${p.id}`)) ??
          DEFAULT_SETTINGS.processor.excalidraw?.processors.at(-1)!;
        if (processor.id.length !== 0) code = code.slice(processor.id.length);

        break;
      default:
        processor =
          this.plugin.settings.processor.codeblock?.processors.find((p) => p.id === kind) ??
          DEFAULT_SETTINGS.processor.codeblock?.processors.at(-1)!;

        if (processor.styling === 'codeblock') {
          containerEl.addClass('HyperMD-codeblock', 'HyperMD-codeblock-bg');
          containerEl = containerEl.createEl('code');
        }

        kind = 'codeblock';
    }
    this.beforeProcessor = processor;
    if (processor.renderingEngine === 'mathjax')
      return this.plugin.originalTex2chtml(code, {
        display: kind !== 'inline',
      });
    containerEl.addClass(`typstmate-${kind}`, `typstmate-style-${processor.styling}`, `typstmate-id-${processor.id}`);

    // レンダリング
    const typstSVGEl = document.createElement('typstmate-svg') as TypstSVGElement;
    typstSVGEl.plugin = this.plugin;
    typstSVGEl.kind = kind as ProcessorKind;
    typstSVGEl.source = code;
    typstSVGEl.processor = processor;
    typstSVGEl.ndir = ndir;
    typstSVGEl.npath = npath;
    containerEl.appendChild(typstSVGEl);
    // ちらつき防止
    const { id: beforeId } = this.beforeProcessor;
    if (this.beforeKind === kind && beforeId === processor.id)
      typstSVGEl.replaceChildren(this.beforeElement.cloneNode(true));

    typstSVGEl.render();

    this.beforeElement = typstSVGEl;
    return containerEl as HTMLElement;
  }

  private async collectFiles(
    baseDirPath: string,
    dirPath: string,
    map: Map<string, Uint8Array | undefined>,
  ): Promise<void> {
    const { filePaths, folderPaths } = await this.list(dirPath);

    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const data = new Uint8Array(await this.readBinary(filePath));
          map.set(filePath.replace(baseDirPath, ''), data);
        } catch {}
      }),
    );

    for (const folderPath of folderPaths) await this.collectFiles(baseDirPath, folderPath, map);
  }

  async createCache(packageSpec: PackageSpec, store: boolean, targetDirPaths?: string[]) {
    const map = new Map<string, Uint8Array>();

    const baseDirPaths = targetDirPaths ?? this.plugin.localPackagesDirPaths;
    for (const baseDirPath of baseDirPaths) {
      try {
        await this.collectFiles(
          baseDirPath,
          `${packageSpec.namespace}/${packageSpec.name}/${packageSpec.version}`,
          map,
        );
      } catch {}
    }

    await this.plugin.app.vault.adapter.writeBinary(
      `${this.plugin.cachesDirNPath}/${packageSpec.namespace}_${packageSpec.name}_${packageSpec.version}.cache`,
      zip(map).slice().buffer,
    );

    const atMap = new Map<string, Uint8Array>();
    for (const [k, v] of map) atMap.set(`@${k}`, v);
    if (store) await this.plugin.typst.store({ sources: atMap });

    return atMap;
  }

  private async list(dirPath: string) {
    let filePaths: string[] = [];
    let folderPaths: string[] = [];
    if (this.plugin.path?.isAbsolute(dirPath)) {
      const items = await this.plugin.fs!.promises.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = this.plugin.path!.join(dirPath, item.name);
        if (item.isDirectory()) folderPaths.push(fullPath);
        else if (item.isFile()) filePaths.push(fullPath);
      }
    } else {
      const listedFiles = await this.plugin.app.vault.adapter.list(dirPath);
      filePaths = listedFiles.files;
      folderPaths = listedFiles.folders;
    }

    return { filePaths, folderPaths };
  }

  private async readBinary(path: string) {
    const { fs } = this.plugin;

    if (fs) {
      if (this.plugin.path?.isAbsolute(path)) return fs.readFileSync(path);
      return fs.readFileSync(`${this.plugin.baseDirPath}/${path}`);
    }
    return this.plugin.app.vault.adapter.readBinary(path);
  }

  async collectTagFiles() {
    const files: Map<string, string> = new Map();
    if (!this.plugin.settings.importPath) return files;

    const importPath = this.plugin.settings.importPath;
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
    for (const tag of tags)
      this.preamble += `#import "${this.plugin.baseDirPath}/${this.plugin.settings.importPath}/tags/${tag.replaceAll('/', '.')}.typ": *;`;
    // Frontmatter variable definitions
    for (const i of imports) this.preamble += `#import ${i};`;
    for (const d of definitions) this.preamble += `#let ${d};`;

    return true;
  }

  refreshView() {
    const view = this.plugin.app.workspace.getActiveFileView();
    if (!(view instanceof MarkdownView)) return;

    if (view.getMode() === 'preview') view.previewMode.rerender(true);
    else view.leaf.rebuildView();
  }
}

export const extarctCMMath = (settings: Settings, code: string, display: boolean) => {
  let eqStart = 0;
  let eqEnd = 0;

  let processor: Processor;
  if (display) {
    // Display
    code = code.replaceAll('<br>', '​​​​'); // ? 文字の長さを合わせる
    code = code.replace(re, (_, s) => `\n${'​'.repeat(s.length)}`); // ? 文字の長さを合わせる

    // プロセッサー選択
    const processors = settings.processor.display?.processors;
    processor = processors?.find((p) => code.startsWith(p.id)) ?? processors?.at(-1)!;
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
    processor = processors?.find((p) => code.startsWith(`${p.id}:`)) ?? processors.at(-1)!;
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
