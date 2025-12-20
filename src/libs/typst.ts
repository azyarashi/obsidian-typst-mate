import { Notice } from 'obsidian';

import { DEFAULT_FONT_SIZE } from '@/constants';
import InlinePreviewElement from '@/core/editor/elements/InlinePreview';
import SnippetSuggestElement from '@/core/editor/elements/SnippetSuggest';
import SymbolSuggestElement from '@/core/editor/elements/SymbolSuggest';
import { DEFAULT_SETTINGS } from '@/core/settings/settings';
import type ObsidianTypstMate from '@/main';
import TypstHTMLElement from '@/ui/elements/HTML';
import TypstSVGElement from '@/ui/elements/SVG';
import { overwriteCustomElements } from '@/utils/custromElementRegistry';
import { unzip, zip } from '@/utils/packageCompressor';

import type { Processor, ProcessorKind } from './processor';
import type { PackageSpec } from './worker';

import './typst.css';
import type TypstElement from '@/ui/elements/Typst';

export default class TypstManager {
  plugin: ObsidianTypstMate;
  ready = false;

  beforeKind?: ProcessorKind;
  beforeProcessor?: Processor;
  beforeElement: HTMLElement = document.createElement('span');

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  async init() {
    this.ready = false;
    this.plugin.updateCrashStatus(true);

    await this.plugin.typst.init(
      await this.plugin.app.vault.adapter.readBinary(this.plugin.wasmPath),
      this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE,
    );

    const fontPaths = (await this.plugin.app.vault.adapter.list(this.plugin.fontsDirNPath)).files.filter((file) =>
      file.endsWith('.font'),
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

    const processors = kind.flatMap(
      (kind) =>
        this.plugin.settings.processor[kind as 'inline' | 'display' | 'codeblock' | 'excalidraw']?.processors.map(
          (p) => ({
            kind,
            id: p.id,
            format: this.format(p, ''),
            styling: p.styling,
            renderingEngine: p.renderingEngine,
          }),
        ) ?? [],
    );

    // キャッシュ
    const sources: Map<string, Uint8Array> = new Map();
    if (!this.plugin.settings.disablePackageCache) {
      const cachePaths = (await this.plugin.app.vault.adapter.list(this.plugin.cachesDirNPath)).files.filter((file) =>
        file.endsWith('.cache'),
      );
      for (const cachePath of cachePaths) {
        try {
          const cacheMap = unzip(await this.plugin.app.vault.adapter.readBinary(cachePath));
          for (const [path, data] of cacheMap) {
            sources.set(`@${path}`, new Uint8Array(data!));
          }
        } catch {
          new Notice(`Failed to load cache: ${cachePath.split('/').pop()}`);
        }
      }
    }

    if (this.plugin.settings.skipPreparationWaiting) {
      const result = this.plugin.typst.store({
        fonts,
        processors,
        sources,
      });
      if (result instanceof Promise) {
        result.then(() => {
          this.ready = true;
          this.plugin.updateCrashStatus(false);

          const waitingElements = document.querySelectorAll('.typstmate-waiting');
          for (const el of waitingElements) {
            const content = el.textContent!;
            el.empty();
            this.render(content, el, el.getAttribute('kind')!);
          }
        });
      } else {
        this.ready = true;
        this.plugin.updateCrashStatus(false);
      }
    } else {
      await this.plugin.typst.store({ fonts, processors, sources });

      this.ready = true;
      this.plugin.updateCrashStatus(false);
    }
  }

  registerOnce() {
    overwriteCustomElements('typstmate-svg', TypstSVGElement);
    overwriteCustomElements('typstmate-html', TypstHTMLElement);
    overwriteCustomElements('typstmate-symbols', SymbolSuggestElement);
    overwriteCustomElements('typstmate-snippets', SnippetSuggestElement);
    overwriteCustomElements('typstmate-inline-preview', InlinePreviewElement);

    // コードブロックプロセッサーをオーバライド
    for (const processor of this.plugin.settings.processor.codeblock?.processors ?? []) {
      try {
        this.plugin.registerMarkdownCodeBlockProcessor(processor.id, (source, el, _ctx) => {
          if (!this.ready) {
            el.textContent = source;
            el.addClass('typstmate-waiting');
            el.setAttribute('kind', processor.id);

            return Promise.resolve(el as HTMLElement);
          }

          return Promise.resolve(this.render(source, el, processor.id));
        });
      } catch {
        new Notice(`Already registered codeblock language: ${processor.id}`);
      }
    }

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

      return this.render(e, container, r.display ? 'display' : 'inline');
    };
  }

  render(code: string, containerEl: Element, kind: string): HTMLElement {
    // プロセッサーを決定
    let processor: Processor;
    let offset = 0;
    let noDiag = false;
    switch (kind) {
      case 'inline':
        // ? プラグイン No more flickering inline math との互換性のため
        if (code.startsWith('{}') && code.endsWith('{}')) {
          offset += code.at(2) === ' ' ? 3 : 2;
          code = code.slice(offset, code.at(-3) === ' ' ? -3 : -2);
        }
        // ? プラグイン obsidian-equation-citator との互換性のため
        if (code.startsWith('\\ref'))
          return 10 <= code.length
            ? document.createSpan(code.slice(5, -1))
            : this.plugin.originalTex2chtml(code, {
                display: kind !== 'inline',
              });

        processor =
          this.plugin.settings.processor.inline?.processors.find((p) => code.startsWith(`${p.id}:`)) ??
          this.plugin.settings.processor.inline?.processors.at(-1) ??
          DEFAULT_SETTINGS.processor.inline?.processors.at(-1)!;
        if (processor.id.length !== 0) {
          code = code.slice(processor.id.length + 1);
          offset += 1;
        }

        break;
      case 'display': {
        const newCode = code.replaceAll(/\n[\s\t]*> /g, '\n');
        if (newCode !== code) noDiag = true;
        code = newCode;

        processor =
          this.plugin.settings.processor.display?.processors.find((p) => code.startsWith(`${p.id}`)) ??
          DEFAULT_SETTINGS.processor.display?.processors.at(-1)!;
        if (processor.id.length !== 0) code = code.slice(processor.id.length);

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
          containerEl.addClass('HyperMD-codeblock', 'HyperMD-codeblock-bg', 'cm-line');
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
    offset += processor.id.length;

    // レンダリング
    let typstEl: TypstElement;

    switch (processor.renderingEngine) {
      case 'typst-svg': {
        typstEl = document.createElement('typstmate-svg') as TypstSVGElement;

        break;
      }
      case 'typst-html': {
        typstEl = document.createElement('typstmate-html') as TypstHTMLElement;
        break;
      }
    }

    typstEl.plugin = this.plugin;
    typstEl.kind = kind as ProcessorKind;
    typstEl.source = code;
    typstEl.processor = processor;
    typstEl.offset = offset;
    typstEl.noDiag = noDiag;
    containerEl.appendChild(typstEl);
    // ちらつき防止
    const { id: beforeId } = this.beforeProcessor;
    if (this.beforeKind === kind && beforeId === processor.id)
      typstEl.replaceChildren(this.beforeElement.cloneNode(true));

    typstEl.render();

    this.beforeElement = typstEl;
    return containerEl as HTMLElement;
  }

  private format(processer: Processor, code: string) {
    return processer.noPreamble
      ? processer.format.replace('{CODE}', code)
      : `${this.plugin.settings.preamble}\n${processer.format.replace('{CODE}', code)}`;
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
        if (item.isDirectory()) {
          folderPaths.push(fullPath);
        } else if (item.isFile()) {
          filePaths.push(fullPath);
        }
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
}
