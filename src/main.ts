import type fsModule from 'node:fs';
import type osModule from 'node:os';
import type pathModule from 'node:path';

import { proxy, type Remote, wrap } from 'comlink';
import {
  addIcon,
  debounce,
  type EventRef,
  loadMathJax,
  type MarkdownView,
  MenuItem,
  Notice,
  Platform,
  Plugin,
  renderMath,
  requestUrl,
  type TFile,
  TFolder,
  type WorkspaceLeaf,
} from 'obsidian';

import { EditorHelper } from '@/editor';
import { initI18n, t } from '@/i18n';
import { BASE_COLOR_VAR, TYPST_SVG_FILL, TYPST_SVG_STROKE } from './constants';
import { DEFAULT_SETTINGS, type Settings } from './data/settings';
import { collectRegions } from './editor/markdown/extensions/MarkdownCore';
import TypstManager from './libs/typst';
import type $ from './libs/worker';
import Typst from './libs/worker';
import TypstWorker from './libs/worker?worker&inline';
import ExcalidrawPlugin from './plugins/excalidraw';
import type TypstSVGElement from './ui/elements/SVG';
import { ExcalidrawModal } from './ui/modals/excalidraw';
import { TemplateSelectModal } from './ui/modals/templateSelect';
import { SettingTab } from './ui/settingsTab';
import { TypstPreviewView } from './ui/views/typst-preview/typstPreview';
import { TypstTextView } from './ui/views/typst-text/typstText';
import { TypstToolsView } from './ui/views/typst-tools/typstTools';
import { exportToPdf } from './utils/export';
import { createNewFile } from './utils/file';
import { zip } from './utils/packageCompressor';

import './main.css';

export default class ObsidianTypstMate extends Plugin {
  pluginId = 'typst-mate';
  settings!: Settings;

  wasmPath!: string;
  baseDirPath!: string; // ? Vaultのパス (末尾の / は含まない) MobileApp では空文字列
  fontsDirNPath!: string; // ? NPath ... Obsidian 用に Normalized された Path
  cachesDirNPath!: string;
  pluginDirNPath!: string;
  packagesDirNPath!: string;
  localPackagesDirPaths!: string[]; // ? ローカルも含む, 0 番目は packagesDirNPath なので NPath

  originalTex2chtml: any;
  typst!: $ | Remote<$>;
  worker?: Worker;
  typstManager!: TypstManager;

  listeners: EventRef[] = [];

  excalidraw?: ExcalidrawPlugin;
  excalidrawPluginInstalled = false;

  editorHelper!: EditorHelper;

  fs?: typeof fsModule;
  os?: typeof osModule;
  path?: typeof pathModule;

  override async onload() {
    await initI18n();
    await this.loadSettings(); // ユーザーの設定 (data.json) を読み込む
    if (3 === (this.settings.crashCount ?? 0)) {
      new Notice(t('notices.crashAutoDisabled'));
      this.settings.crashCount = 0;
      await this.saveSettings();
      await this.app.plugins.disablePlugin(this.pluginId);
      return;
    }

    const { app } = this;
    const vault = app.vault;
    const adapter = vault.adapter;

    if (Platform.isDesktopApp) {
      this.fs = require('node:fs');
      this.os = require('node:os');
      this.path = require('node:path');
    }

    // 基本的なパスの設定
    this.setPaths();
    // 色を設定
    this.applyBaseColor();
    // アイコンを追加
    addIcon('typst-fill', TYPST_SVG_FILL);
    addIcon('typst-stroke', TYPST_SVG_STROKE);
    // マニフェストの読み込みと Wasm のパスを設定
    const manifestPath = `${this.pluginDirNPath}/manifest.json`;
    const version = JSON.parse(await adapter.read(manifestPath)).version;
    this.wasmPath = `${this.pluginDirNPath}/typst-${version}.wasm`;

    // 必要なディレクトリの作成
    await this.tryCreateDirs();

    // Wasm の準備
    if (!(await adapter.exists(this.wasmPath))) await this.downloadWasm(version);
    // MathJax を読み込む
    await this.prepareMathJax();
    // TypstManager を設定する
    await this.prepareTypst();
    // EditorHelper を設定する
    this.editorHelper = new EditorHelper(this);

    this.registerView(TypstToolsView.viewtype, (leaf) => new TypstToolsView(leaf, this));
    this.registerView(TypstTextView.viewtype, (leaf) => new TypstTextView(leaf, this));
    this.registerView(TypstPreviewView.viewtype, (leaf) => new TypstPreviewView(leaf, this));

    // ? Obsidian の起動時間を短縮するため onLayoutReady を使用
    this.app.workspace.onLayoutReady(() => {
      // 他のプラグインとの連携
      this.connectOtherPlugins();

      // 設定タブを登録
      this.addSettingTab(new SettingTab(this.app, this));

      // View を登録
      this.registerExtensions(['typ'], TypstTextView.viewtype);
      if (
        this.settings.openTypstToolsOnStartup &&
        this.app.workspace.getLeavesOfType(TypstToolsView.viewtype).length === 0
      )
        this.activateLeaf();

      // コマンドを登録する
      this.addCommands();

      // 監視を登録する
      this.registerListeners();

      // Style Settings に登録
      app.workspace.trigger('parse-style-settings');
    });

    super.onload();
  }

  private setPaths() {
    this.baseDirPath = Platform.isDesktopApp ? this.app.vault.adapter.basePath : '';
    this.pluginDirNPath = `${this.app.vault.configDir}/plugins/${this.pluginId}`; // .obsidian/plugins/typst-mate
    this.fontsDirNPath = `${this.pluginDirNPath}/fonts`;
    this.cachesDirNPath = `${this.pluginDirNPath}/caches`;
    this.packagesDirNPath = `${this.pluginDirNPath}/packages`;

    this.localPackagesDirPaths = [this.packagesDirNPath];
    if (!Platform.isDesktopApp) return; // ? iOS/iPadOS でも Platform.isMacOS が true になる
    switch (true) {
      case Platform.isWin: {
        const localAppData = process.env.LOCALAPPDATA ?? this.path!.join(this.os!.homedir(), 'AppData', 'Local');
        const winPackagesPath = this.path!.join(localAppData, 'typst', 'packages');
        this.localPackagesDirPaths.push(winPackagesPath);
        break;
      }
      case Platform.isMacOS: {
        const macLibraryCachePath = this.path!.join(this.os!.homedir(), 'Library', 'Caches');
        const macPackagesPath = this.path!.join(macLibraryCachePath, 'typst', 'packages');
        this.localPackagesDirPaths.push(macPackagesPath);
        break;
      }
      case Platform.isLinux: {
        const xdgCachePath = process.env.XDG_CACHE_HOME ?? this.path!.join(this.os!.homedir(), '.local', 'share');
        const linuxPackagesPath = this.path!.join(xdgCachePath, 'typst', 'packages');
        this.localPackagesDirPaths.push(linuxPackagesPath);
        break;
      }
    }
  }

  private async tryCreateDirs() {
    const dirPaths = [this.fontsDirNPath, this.cachesDirNPath, this.packagesDirNPath];

    await Promise.allSettled(dirPaths.map((dirPath) => this.app.vault.adapter.mkdir(dirPath))).catch(() => {});
  }

  private async prepareMathJax() {
    await loadMathJax();
    if (window.MathJax === undefined) throw new Error('Failed to load MathJax.');
    renderMath('', false); // ? 副作用 (スタイル) のため
    this.originalTex2chtml = window.MathJax.tex2chtml; // ? Plugin を unload したときに戻すため。Fallback 処理のため。
  }

  private async prepareTypst() {
    this.typstManager = new TypstManager(this);
    this.typstManager.registerOnce();
    await this.init().catch((err) => {
      console.error(err);
      new Notice(t('notices.initFailed'));
    });
  }

  private async downloadWasm(version: string) {
    new Notice(t('notices.downloadingWasm'));

    // 古い Wasm を削除する
    const oldWasms = (await this.app.vault.adapter.list(this.pluginDirNPath)).files.filter((file) =>
      file.endsWith('.wasm'),
    );
    oldWasms.forEach(this.app.vault.adapter.remove.bind(this.app.vault.adapter));

    // 最新の Wasm がある URL を取得する
    const releaseUrl = `https://api.github.com/repos/azyarashi/obsidian-typst-mate/releases/tags/${version}`;
    const releaseResponse = await requestUrl(releaseUrl);
    const releaseData = (await releaseResponse.json) as { assets: GitHubAsset[] };
    const asset = releaseData.assets.find((asset) => asset.name === `typst-${version}.wasm`);
    if (!asset) throw new Error(`Could not find ${this.wasmPath} in release assets`);

    // Wasm をダウンロードする (chunked with range headers to prevent memory explosion)
    const totalSize = asset.size;
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
    const ranges: [number, number][] = [];

    for (let i = 0; i < chunkCount; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
      ranges.push([start, end]);
    }

    const chunkPromises = ranges.map(async ([start, end]) => {
      const response = await requestUrl({
        url: asset.url,
        headers: {
          Accept: 'application/octet-stream',
          Range: `bytes=${start}-${end}`,
        },
      });
      return { start, data: new Uint8Array(response.arrayBuffer) };
    });

    const chunks = await Promise.all(chunkPromises);

    const totalBuffer = new Uint8Array(totalSize);
    chunks.sort((a, b) => a.start - b.start);
    for (const chunk of chunks) {
      totalBuffer.set(chunk.data, chunk.start);
    }
    await this.app.vault.adapter.writeBinary(this.wasmPath, totalBuffer.buffer);

    new Notice(t('notices.wasmDownloaded'));
  }

  async activateLeaf(active = false, content?: string) {
    let leaf: WorkspaceLeaf | null | undefined;
    [leaf] = this.app.workspace.getLeavesOfType(TypstToolsView.viewtype);
    if (!leaf) {
      leaf = this.app.workspace.getLeftLeaf(false);
      if (leaf) this.app.workspace.revealLeaf(leaf);
    }

    await leaf?.setViewState({ type: TypstToolsView.viewtype, active });
    if (content) (leaf?.view as TypstToolsView).openContent(content);
  }

  private connectOtherPlugins() {
    // Excalidraw
    if ('obsidian-excalidraw-plugin' in this.app.plugins.plugins) {
      const excalidrawPlugin = this.app.plugins.plugins['obsidian-excalidraw-plugin'];
      this.excalidraw = new ExcalidrawPlugin(this, excalidrawPlugin);
      this.excalidrawPluginInstalled = true;
    }
  }

  private addCommands() {
    this.addCommand({
      id: 'tools-open',
      name: t('commands.openTypstTools'),
      callback: async () => {
        await this.activateLeaf(true);
      },
    });

    this.addCommand({
      id: 'toggle-background-rendering',
      name: t('commands.toggleBackgroundRendering'),
      callback: async () => {
        this.settings.enableBackgroundRendering = !this.settings.enableBackgroundRendering;
        await this.saveSettings();
        await this.reload(false);
      },
    });

    this.addCommand({
      id: 'tex2typ',
      name: t('commands.replaceTexWithTypst'),
      editorCallback: async (editor) => {
        const view = editor.cm;
        if (!view) {
          new Notice(t('notices.noActiveView'));
          return;
        }

        const selection = view.state.selection.main;
        const regions = collectRegions(
          view,
          !selection.empty ? selection.from : undefined,
          !selection.empty ? selection.to : undefined,
        ).filter((region) => region.kind !== 'codeblock');

        if (selection.empty && regions.length === 0) {
          editor.replaceSelection(await this.typst.latexeq_to_typm(editor.getSelection()));
          return;
        }

        for (const region of regions) {
          const content = view.state.sliceDoc(region.from, region.to);
          const math = await this.typst.latexeq_to_typm(content);
          const fromPosition = editor.offsetToPos(region.from);
          const toPosition = editor.offsetToPos(region.to);
          editor.replaceRange(math, fromPosition, toPosition);
        }
      },
    });

    this.addCommand({
      id: 'box-current-equation',
      name: t('commands.boxCurrentEquation'),
      editorCallback: (editor) => this.editorHelper.boxCurrentEquation(editor.cm),
    });

    this.addCommand({
      id: 'select-current-equation',
      name: t('commands.selectCurrentEquation'),
      editorCallback: (editor) => this.editorHelper.selectCurrentEquation(editor.cm),
    });

    this.addCommand({
      id: 'reload tag files',
      name: t('commands.reloadTagFiles'),
      editorCallback: async () => {
        const files = await this.typstManager.collectTagFiles();
        await this.typst.store({ files });

        this.typstManager.refreshView();
      },
    });

    if (this.excalidrawPluginInstalled) {
      this.addCommand({
        id: 'render-to-excalidraw',
        name: t('commands.renderToExcalidraw'),
        callback: () => {
          new ExcalidrawModal(this.app, this).open();
        },
      });
    }
  }

  private registerListeners() {
    const applyBaseColor = this.applyBaseColor.bind(this);
    let theme = this.app.vault.config.theme;
    Object.defineProperty(this.app.vault.config, 'theme', {
      configurable: true,
      enumerable: true,
      get() {
        return theme;
      },
      set(v) {
        theme = v;
        setTimeout(applyBaseColor);
      },
    });

    const refresh = debounce(
      () => {
        const svgs = document.querySelectorAll('typstmate-svg') as NodeListOf<TypstSVGElement> | undefined;
        if (!svgs) return;
        for (const svg of svgs) if (svg.processor.fitToNoteWidth) svg.render();
      },
      100,
      true,
    );

    this.listeners.push(
      // ? css-change が意図しない値を渡すので arrow function で包む
      this.app.workspace.on('css-change', () => this.applyBaseColor.bind(this)),
      this.app.workspace.on('leaf-menu', (menu, leaf) => {
        if (leaf.view.getViewType() === 'markdown') {
          const pdfItems = menu.items
            .filter((item) => item instanceof MenuItem)
            .filter((item) => item.titleEl?.innerText.toLowerCase().includes('pdf'));

          pdfItems.forEach((pdfItem) => {
            const defaultAction = pdfItem.callback ?? (() => {});
            const beforeEnableBackgroundRendering = this.settings.enableBackgroundRendering;

            let disconnected = false;
            const observer = new MutationObserver(async (mutations) => {
              for (const m of mutations) {
                if (!m.removedNodes.length) return;
                if (document.querySelector('div.modal') || document.querySelector('div.progress-bar-container')) return;
                observer.disconnect();
                clearTimeout(id);
                disconnected = true;

                // postprocess
                this.applyBaseColor();
                if (beforeEnableBackgroundRendering) {
                  this.settings.enableBackgroundRendering = true;
                  await this.init();
                }
              }
            });

            let id: NodeJS.Timeout;
            pdfItem.callback = async () => {
              // preprocess
              if (this.settings.patchPDFExport) this.applyBaseColor(true);
              if (this.settings.enableBackgroundRendering) {
                this.settings.enableBackgroundRendering = false;
                await this.init();
              }

              defaultAction();
              observer.observe(document.body, { childList: true, subtree: true });
              id = setTimeout(async () => {
                if (disconnected) return;
                observer.disconnect();

                // postprocess
                this.applyBaseColor();
                if (beforeEnableBackgroundRendering) {
                  this.settings.enableBackgroundRendering = true;
                  await this.init();
                }
              }, 60000);
            };
          });
        }

        if (leaf.view.getViewType() !== TypstTextView.viewtype) return;
        menu.addItem(async (item) => {
          item.setTitle(t('contextMenu.openAsPreview')).onClick(async () => {
            await leaf.setViewState({
              type: TypstPreviewView.viewtype,
              state: { file: (leaf.view as TypstTextView).file },
            });
          });
        });
      }),
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFolder)) return;
        menu.addItem((item) => {
          item.setTitle(t('contextMenu.newTypstFile')).onClick(async () => {
            const tfile = await createNewFile(this.app.vault, file);
            this.app.workspace.getLeaf(true).openFile(tfile);
          });
          menu.addItem((item) => {
            item.setTitle(t('contextMenu.newTypstFileWithTemplate')).onClick(() => {
              new TemplateSelectModal(this, file).open();
            });
          });
        });
      }),
      this.app.metadataCache.on('changed', (file) => {
        const cache = this.app.metadataCache.getCache(file.path);
        if (!cache) return;
        if (this.typstManager.syncFileCache(cache)) this.typstManager.refreshView();
      }),
      this.app.workspace.on('active-leaf-change', (leaf) => {
        if (leaf?.view.getViewType() !== 'markdown') return;
        const path = (leaf?.view as MarkdownView).file?.path;
        if (!path) return;
        const cache = this.app.metadataCache.getCache(path);
        if (cache) this.typstManager.syncFileCache(cache);
      }),
      this.app.workspace.on('resize', refresh),
    );

    const embedRegistry = this.app.embedRegistry;
    if (embedRegistry.isExtensionRegistered('typ')) embedRegistry.unregisterExtension('typ');
    embedRegistry.registerExtension('typ', (context, file, subpath) => {
      const component = embedRegistry.embedByExtension.pdf(context, file, subpath);
      const originalLoadFile = component.loadFile.bind(component);

      component.loadFile = async () => {
        if (file.extension !== 'typ') return originalLoadFile();

        const content = await this.app.vault.read(file);
        const pdfPath = `${file.path.slice(0, -file.extension.length - 1)}.pdf`;
        const isExist = await this.app.vault.exists(pdfPath);

        if (isExist) {
          const pdfFile = this.app.vault.getAbstractFileByPath(pdfPath);
          // @ts-expect-error
          if (pdfFile) component.file = pdfFile as TFile;
        } else {
          const result = await exportToPdf(this, file, content, { tagged: false, standards: [] }, false);
          if (result) {
            const pdfFile = this.app.vault.getAbstractFileByPath(result);
            // @ts-expect-error
            if (pdfFile) component.file = pdfFile as TFile;
          }

          setTimeout(() => this.app.vault.delete(this.app.vault.getAbstractFileByPath(pdfPath) as TFile), 1000);
        }

        originalLoadFile();
      };

      return component;
    });
  }

  async init() {
    this.worker?.terminate();

    const { fs, path, baseDirPath, packagesDirNPath, cachesDirNPath } = this;
    const adapter = this.app.vault.adapter;

    const main = {
      notice(message: string, duration?: number) {
        new Notice(message, duration);
      },

      readBinary(p: string) {
        // MobileApp
        if (!fs) return adapter.readBinary(p);

        // DesktopApp
        if (path!.isAbsolute(p)) return fs.readFileSync(p);
        return fs.readFileSync(`${baseDirPath}/${p}`);
      },

      async writePackage(path: string, files: tarFile[]) {
        const map = new Map<string, Uint8Array>();

        // ディレクトリ
        for (const file of files.filter((f) => f.type === '5')) {
          await adapter.mkdir(`${packagesDirNPath}/${path}/${file.name}`);
        }

        // ファイル
        for (const file of files.filter((f) => f.type === '0')) {
          await adapter.writeBinary(`${packagesDirNPath}/${path}/${file.name}`, file.buffer);
          map.set(`${path}/${file.name}`, new Uint8Array(file.buffer));
        }

        // シンボリックリンク
        for (const file of files.filter((f) => f.type === '2')) {
          await adapter.copy(
            `${packagesDirNPath}/${path}/${file.name}`,
            `${packagesDirNPath}/${path}/${file.linkname}`,
          );
          map.set(`${path}/${file.linkname}`, map.get(`${path}/${file.name}`)!);
        }

        const [namespace, name, version] = path.split('/');
        await adapter
          .writeBinary(
            // ? .DS_STORE などが紛れ込まないようにするため
            `${cachesDirNPath}/${namespace}_${name}_${version}.cache`,
            zip(map).slice().buffer,
          )
          .catch(() => {});
      },
    };

    if (this.settings.enableBackgroundRendering) {
      this.worker = new TypstWorker();
      const api = wrap<typeof $>(this.worker);
      this.typst = await new api(this.localPackagesDirPaths, this.baseDirPath, Platform.isDesktopApp);
      await this.typst.setMain(proxy(main));
    } else {
      this.typst = new Typst(this.localPackagesDirPaths, this.baseDirPath, Platform.isDesktopApp);
      this.typst.setMain(main);
    }

    await this.typstManager.init();
  }

  applyBaseColor(forceBaseColor: boolean = false) {
    // ? Canvas にも適用するためbodyへの適用が必要
    if (!this.settings.autoBaseColor || forceBaseColor)
      return document.body.style.setProperty(BASE_COLOR_VAR, this.settings.baseColor);

    const bodyStyles = getComputedStyle(document.body);
    const baseColor = bodyStyles.getPropertyValue('--text-normal').trim();
    document.body.style.setProperty(BASE_COLOR_VAR, baseColor);
  }

  override async onunload() {
    if (3 <= (this.settings.crashCount ?? 0)) return;

    const temporaryEls = document.querySelectorAll('.typstmate-temporary');
    for (const temporaryEl of temporaryEls) temporaryEl.remove();

    // 監視を終了
    this.listeners.forEach(this.app.workspace.offref.bind(this.app.workspace));
    // this.editorHelper.close();

    // Worker を終了
    this.worker?.terminate();

    // MathJax のオーバーライドを解除
    if (window.MathJax !== undefined) window.MathJax.tex2chtml = this.originalTex2chtml;

    // MarkdownCodeBlockProcessor のオーバーライドは自動で解除

    await this.saveSettings();
    super.onunload();
  }

  async reload(openSettingsTab: boolean) {
    await this.app.plugins.disablePlugin(this.pluginId); // ? onunload も呼ばれる
    await this.app.plugins.enablePlugin(this.pluginId); // ? onload も呼ばれる
    if (openSettingsTab) this.app.setting.openTabById(this.pluginId);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  override onConfigFileChange = debounce(this.loadSettings.bind(this), 500, true);
  override onExternalSettingsChange = debounce(this.loadSettings.bind(this), 500, true);

  updateCrashStatus(crash: boolean) {
    if (!crash) {
      this.settings.crashCount = 0;
      this.saveSettings();
      return;
    }
    if (this.settings.crashCount !== undefined) this.settings.crashCount += 1;
    else this.settings.crashCount = 1;
    this.saveSettings();
  }
}
