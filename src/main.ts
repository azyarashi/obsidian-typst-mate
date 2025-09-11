import type fsModule from 'node:fs';

import { proxy, type Remote, wrap } from 'comlink';
import {
  debounce,
  type Editor,
  type EventRef,
  loadMathJax,
  type MarkdownView,
  Notice,
  Platform,
  Plugin,
  renderMath,
  requestUrl,
  type WorkspaceLeaf,
} from 'obsidian';

import { EditorHelper } from './core/editor';
import { TypstToolsView } from './core/leaf';
import { DEFAULT_SETTINGS, type Settings, SettingTab } from './core/settings';
import { ParentResizeService } from './lib/observer';
import TypstManager from './lib/typst';
import { zip } from './lib/util';
import type $ from './lib/worker';
import Typst from './lib/worker';
import TypstWorker from './lib/worker?worker&inline';

interface GitHubAsset {
  name: string;
  url: string;
}

export default class ObsidianTypstMate extends Plugin {
  pluginId = 'typst-mate';
  pluginDirPath!: string;
  version!: string;
  settings!: Settings;

  wasmPath!: string;
  baseDirPath!: string;
  fontsDirPath!: string;
  cachesDirPath!: string;
  packagesDirPath!: string;
  originalTex2chtml: any;

  typst!: $ | Remote<$>;
  worker?: Worker;
  typstManager!: TypstManager;
  observer!: ParentResizeService;

  baseColor = '#000000';
  listeners: EventRef[] = [];

  private editorHelper!: EditorHelper;

  fs?: typeof fsModule;

  override async onload() {
    // EditorHelperを初期化
    this.editorHelper = new EditorHelper(this.app);

    // ユーザーの設定(data.json)を読み込む
    await this.loadSettings();
    const adapter = this.app.vault.adapter;

    if (Platform.isDesktopApp) {
      this.fs = require('node:fs');
    }

    // よく用いるパスを設定する
    this.baseDirPath = adapter.basePath;
    this.pluginDirPath = `${this.app.vault.configDir}/plugins/${this.pluginId}`;
    this.fontsDirPath = `${this.pluginDirPath}/fonts`;
    this.cachesDirPath = `${this.pluginDirPath}/caches`;
    this.packagesDirPath = `${this.pluginDirPath}/packages`;

    // 必要なディレクトリを作成する
    // ? ディレクトリの存在確認の挙動が安定しないので, 作成して例外を無視する
    await this.tryCreateDirs([
      this.fontsDirPath,
      this.cachesDirPath,
      this.packagesDirPath,
    ]);

    // 存在しない場合, 最新のWasmをダウンロードする
    this.version = JSON.parse(
      await this.app.vault.adapter.read(`${this.pluginDirPath}/manifest.json`),
    ).version;

    this.wasmPath = `${this.pluginDirPath}/typst-${this.version}.wasm`;
    if (!(await this.app.vault.adapter.exists(this.wasmPath))) {
      await this.downloadLatestWasm(this.wasmPath);
    }

    // MathJaxを読み込む
    await loadMathJax();
    if (window.MathJax === undefined)
      throw new Error('Failed to load MathJax.');
    renderMath('', false); // ? 副作用(スタイル)のため
    this.originalTex2chtml = window.MathJax.tex2chtml; // ? Pluginをunloadしたときに戻すため. Fallback処理のため.

    // 監視を追加する
    const styles = getComputedStyle(document.body);
    this.baseColor = styles.getPropertyValue('--color-base-100').trim();
    this.listeners.push(
      this.app.workspace.on('css-change', () => {
        if (this.settings.autoBaseColor) this.applyBaseColor();
      }),
    );

    // TypstManagerを設定する
    this.observer = new ParentResizeService();
    this.typstManager = new TypstManager(this);
    try {
      await this.init();
    } catch (err) {
      console.error(err);
      new Notice(
        'Failed to initialize Typst. Please check that the processor ID does not contain any symbols, try clearing the package cache, and ensure that there are no invalid fonts installed.',
      );
    }
    await this.typstManager.registerOnce();

    // 設定タブを登録
    this.addSettingTab(new SettingTab(this.app, this));

    // Leafを登録
    // ? iframeがモバイルで使えないため無効化
    if (Platform.isMobileApp) return;
    this.registerView(
      TypstToolsView.viewtype,
      (leaf) => new TypstToolsView(leaf),
    );
    this.activateLeaf();
    this.addCommand({
      id: 'typst-tools-open',
      name: 'Typst Tools',
      callback: async () => {
        const leaf = await this.activateLeaf();
        if (leaf) {
          this.app.workspace.revealLeaf(leaf);
        }
      },
    });
    this.addCommand({
      id: 'typst-toggle-rendering-engine',
      name: 'Toggle Rendering Engine',
      callback: async () => {
        this.settings.enableBackgroundRendering =
          !this.settings.enableBackgroundRendering;
        await this.saveSettings();
        await this.reload(false);
      },
    });

    const editorChangeRef = this.app.workspace.on(
      // @ts-expect-error
      'editor-change',
      this.onEditorChange,
    );
    const activeLeafChangeRef = this.app.workspace.on(
      'active-leaf-change',
      this.editorHelper.removePreview.bind(this),
    );
    this.registerEvent(editorChangeRef);
    this.registerEvent(activeLeafChangeRef);
    this.listeners.push(editorChangeRef, activeLeafChangeRef);
  }

  private async tryCreateDirs(dirPaths: string[]) {
    await Promise.allSettled(
      dirPaths.map((dirPath) => this.app.vault.adapter.mkdir(dirPath)),
    ).catch(() => {});
  }

  private async downloadLatestWasm(wasmPath: string) {
    new Notice('Downloading latest wasm...');

    // 古いWasmを削除する
    const oldWasms = (
      await this.app.vault.adapter.list(this.pluginDirPath)
    ).files.filter((file) => file.endsWith('.wasm'));
    for (const wasm of oldWasms) {
      await this.app.vault.adapter.remove(wasm);
    }

    // 最新のWasmがあるURLを取得する
    const releaseUrl = `https://api.github.com/repos/azyarashi/obsidian-typst-mate/releases/tags/${this.version}`;
    const releaseResponse = await requestUrl(releaseUrl);
    const releaseData = (await releaseResponse.json) as {
      assets: GitHubAsset[];
    };
    const asset = releaseData.assets.find(
      (asset) => asset.name === `typst-${this.version}.wasm`,
    );
    if (!asset) throw new Error(`Could not find ${wasmPath} in release assets`);

    // Wasmをダウンロードする
    const response = await requestUrl({
      url: asset.url,
      headers: { Accept: 'application/octet-stream' },
    });
    const data = response.arrayBuffer;
    await this.app.vault.adapter.writeBinary(wasmPath, data);

    new Notice('Wasm downloaded!');
  }

  async init() {
    this.worker?.terminate();

    const { fs, baseDirPath, packagesDirPath, cachesDirPath } = this;
    const adapter = this.app.vault.adapter;

    const main = {
      notice(message: string) {
        new Notice(message);
      },

      readBinary(path: string) {
        if (fs)
          return Uint8Array.from(fs.readFileSync(`${baseDirPath}/${path}`));
        return adapter.readBinary(path);
      },

      writePackage(path: string, files: tarFile[]) {
        const map = new Map<string, Uint8Array>();

        // ディレクトリ
        for (const f of files.filter((f) => f.type === '5')) {
          adapter.mkdir(`${packagesDirPath}/${path}/${f.name}`);
        }

        // ファイル
        for (const f of files.filter((f) => f.type === '0')) {
          adapter.writeBinary(`${packagesDirPath}/${path}/${f.name}`, f.buffer);
          map.set(`${path}/${f.name}`, new Uint8Array(f.buffer));
        }

        // シンボリックリンク
        for (const f of files.filter((f) => f.type === '2')) {
          adapter.copy(
            `${packagesDirPath}/${path}/${f.name}`,
            `${packagesDirPath}/${path}/${f.linkname}`,
          );
          map.set(`${path}/${f.linkname}`, map.get(`${path}/${f.name}`)!);
        }

        const [namespace, name, version] = path.split('/');
        adapter
          .writeBinary(
            // ? .DS_STORE などが紛れ込まないようにするため
            `${cachesDirPath}/${namespace}_${name}_${version}.cache`,
            zip(map).slice().buffer,
          )
          .then(() => {
            new Notice('Cached successfully!');
          });
      },
    };
    const wasm = await adapter.readBinary(this.wasmPath);

    if (this.settings.enableBackgroundRendering) {
      this.worker = new TypstWorker();
      const api = wrap<typeof $>(this.worker);
      this.typst = await new api(wasm, packagesDirPath);
      await this.typst.setMain(proxy(main));
    } else {
      this.typst = new Typst(wasm, packagesDirPath);
      this.typst.setMain(main);
    }

    await this.typstManager.init();
  }

  applyBaseColor() {
    const styles = getComputedStyle(document.body);

    const beforeColor = this.baseColor;
    this.baseColor = styles.getPropertyValue('--color-base-100').trim();
    const svgs = document.querySelectorAll('svg.typst-doc');
    svgs.forEach((svg) => {
      svg.innerHTML = svg.innerHTML.replaceAll(beforeColor, this.baseColor);
    });
  }

  private async activateLeaf() {
    let leaf: WorkspaceLeaf | null | undefined;
    [leaf] = this.app.workspace.getLeavesOfType(TypstToolsView.viewtype);

    if (!leaf) {
      leaf = this.app.workspace.getLeftLeaf(false);
      await leaf?.setViewState({ type: TypstToolsView.viewtype });
    }

    return leaf;
  }

  override async onunload() {
    // 監視を終了
    this.observer.stopAll();
    for (const listener of this.listeners) {
      this.app.workspace.offref(listener);
    }

    // Workerを終了
    this.worker?.terminate();

    // MathJaxのオーバーライドを解除
    if (window.MathJax !== undefined)
      window.MathJax.tex2chtml = this.originalTex2chtml;

    // MarkdownCodeBlockProcessorのオーバーライドは自動で解除

    // 登録したLeafを閉じる
    const leafs = this.app.workspace.getLeavesOfType(TypstToolsView.viewtype);
    for (const leaf of leafs) {
      leaf.detach();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  override onConfigFileChange = debounce(
    async () => {
      await this.loadSettings();
    },
    500,
    true,
  );

  async reload(openSettingsTab = true) {
    await this.app.plugins.disablePlugin(this.pluginId); // ? onunloadも呼ばれる
    await this.app.plugins.enablePlugin(this.pluginId); // ? onloadも呼ばれる
    if (openSettingsTab) this.app.setting.openTabById(this.pluginId);
  }

  onEditorChange = (editor: Editor, _markdownView: MarkdownView) => {
    if (!this.settings.enableInlinePreview) return;
    this.editorHelper.updatePreview(editor);
  };
}
