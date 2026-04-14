import type { WatcherSubscription } from '@typst-mate/watcher';
import { type DataAdapter, FileSystemAdapter, Notice, Platform, requestUrl, type TFile, type TFolder } from 'obsidian';
import { TypstMate } from '@/api';
import { t } from '@/i18n';
import { settingsManager } from '@/libs';
import { features, fs, loadWatcher, os, path, watcher } from '@/libs/features';
import ObsidianTypstMate from '@/main';
import type { GitHubAsset, PackageAsset } from '@/types/global';
import type { Singleton } from '@/types/singleton';
import type { PackageSpec } from '@/types/typst';
import { filterWithExtensions } from './utils';

/**
 * Path conventions:
 *
 * - DirPath: A directory path that **does NOT end with a trailing slash**.
 * - NPath: A normalized path.
 * @see [Plugin guidelines: Use normalizePath() to clean up user-defined paths](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use+%60normalizePath()%60+to+clean+up+user-defined+paths)
 */
export class FileManager implements Singleton {
  private plugin?: ObsidianTypstMate;

  adapter!: DataAdapter;

  /**
   * - **DesktopApp**: Base OS path for the vault (e.g. /home/user/vault, or C:\Users\user\documents\vault).
   * - **MobileApp**: Empty string.
   * */
  baseDirPath!: string;

  /** Example: `.obsidian/plugins/typst-mate` */
  pluginDirNPath!: string;

  wasmNPath!: string;
  watcherNPath!: string;
  fontsDirNPath!: string;

  packagesDirNPath!: string;
  packagesDirPaths!: string[];

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    this.adapter = plugin.app.vault.adapter;

    // @ts-expect-error
    this.baseDirPath = features.node ? this.adapter.basePath : '';

    this.pluginDirNPath = `${this.plugin.app.vault.configDir}/plugins/${ObsidianTypstMate.id}`;

    this.wasmNPath = `${this.pluginDirNPath}/typst-${TypstMate.version}.wasm`;
    this.watcherNPath = `${this.pluginDirNPath}/watcher-${TypstMate.version}.js`;

    this.fontsDirNPath = `${this.pluginDirNPath}/fonts`;
    this.packagesDirNPath = `${this.pluginDirNPath}/packages`;

    this.setPackagesDirPaths();

    // TODO
    if (features.node && this.adapter instanceof FileSystemAdapter) {
      const pluginFullPath = this.adapter.getFullPath(this.pluginDirNPath);
      loadWatcher(pluginFullPath, TypstMate.version!, settingsManager.settings.linuxLibc);
    }
  }

  private setPackagesDirPaths() {
    this.packagesDirPaths = [
      Platform.isMobileApp ? this.packagesDirNPath : `${this.baseDirPath}/${this.packagesDirNPath}`,
    ];

    let packagesDirPath: string | undefined;
    switch (true) {
      case Platform.isMobileApp: {
        // ! iOS/iPadOS でも Platform.isMacOS が true になる
        break;
      }
      case Platform.isWin: {
        const localAppDataPath = process.env.LOCALAPPDATA ?? path!.join(os!.homedir(), 'AppData', 'Local');
        packagesDirPath = path!.join(localAppDataPath, 'typst', 'packages');
        break;
      }
      case Platform.isMacOS: {
        const applicationSupportPath = path!.join(os!.homedir(), 'Library', 'Application Support');
        packagesDirPath = path!.join(applicationSupportPath, 'typst', 'packages');
        break;
      }
      case Platform.isLinux: {
        const localSharePath = path!.join(os!.homedir(), '.local', 'share');
        packagesDirPath = path!.join(localSharePath, 'typst', 'packages');
        break;
      }
    }

    if (packagesDirPath && fs?.existsSync(packagesDirPath)) this.packagesDirPaths.push(packagesDirPath);
  }

  async ensureWasm(files: string[]) {
    const wasms = files.filter((file) => file.endsWith('.wasm'));
    for (const f of wasms.filter((wasm) => wasm !== this.wasmNPath)) await this.adapter.remove(f);
    if (!wasms.includes(this.wasmNPath)) await this.downloadAsset(this.wasmNPath);
  }

  // TODO
  async ensureWatcher() {
    const files = (await this.adapter.list(this.pluginDirNPath)).files;

    const watchers = files.filter((file) => file.endsWith('.js') && file.includes('watcher-'));
    for (const f of watchers.filter((w) => w !== this.watcherNPath)) await this.adapter.remove(f);
    if (!watchers.includes(this.watcherNPath)) await this.downloadAsset(this.watcherNPath);

    if (features.node) {
      const nodes = files.filter((file) => file.endsWith('.node') && file.includes('watcher-'));
      const platform = this.getWatcherPlatform();
      const nodeNPath = `${this.pluginDirNPath}/watcher-${platform}-${TypstMate.version}.node`;

      for (const f of nodes.filter((n) => n !== nodeNPath)) await this.adapter.remove(f);
      if (!nodes.includes(nodeNPath)) await this.downloadAsset(nodeNPath);
    }
  }

  getWatcherPlatform(): string {
    const os = require('node:os');
    const platform = os.platform();
    const arch = os.arch();

    if (platform === 'linux') {
      const libc = settingsManager.settings.linuxLibc;
      return `linux-${arch}-${libc}`;
    }
    if (platform === 'win32') return `win32-${arch}`;
    if (platform === 'darwin') return `darwin-${arch}`;
    if (platform === 'freebsd') return `freebsd-${arch}`;

    return `${platform}-${arch}`;
  }

  async downloadAsset(targetPath: string) {
    const filename = targetPath.split('/').pop()!;
    new Notice(t('notices.downloadingAsset', { asset: filename }));

    // 最新の Asset がある URL を取得する
    const releaseUrl = `https://api.github.com/repos/azyarashi/obsidian-typst-mate/releases/tags/${TypstMate.version}`;
    const releaseResponse = await requestUrl(releaseUrl);
    const releaseData = (await releaseResponse.json) as { assets: GitHubAsset[] };
    const asset = releaseData.assets.find((asset) => asset.name === filename);
    if (!asset) throw new Error(`Could not find ${filename} in release assets`);

    // Asset をダウンロードする (chunked with range headers to prevent memory explosion)
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
    await this.adapter.writeBinary(targetPath, totalBuffer.buffer);

    new Notice(t('notices.assetDownloaded', { asset: filename }));
  }

  async readPackage(_spec: PackageSpec): Promise<undefined> {
    return;
  }

  async downloadPackage(_spec: PackageSpec): Promise<undefined> {
    return;
  }

  async writePackage(path: string, files: PackageAsset) {
    // TODO: DesktopApp では ローカルにデフォルトでインストール
    // ディレクトリ
    for (const file of files.filter((f) => f.type === '5')) {
      await this.adapter.mkdir(`${this.packagesDirNPath}/${path}/${file.name}`);
    }

    // ファイル
    for (const file of files.filter((f) => f.type === '0')) {
      await this.adapter.writeBinary(`${this.packagesDirNPath}/${path}/${file.name}`, file.buffer);
    }

    // シンボリックリンク
    for (const file of files.filter((f) => f.type === '2')) {
      await this.adapter.copy(
        `${this.packagesDirNPath}/${path}/${file.name}`,
        `${this.packagesDirNPath}/${path}/${file.linkname}`,
      );
    }
  }

  async createNewFile(target: TFile | TFolder, content = '', ext = 'typ'): Promise<TFile | undefined> {
    if (!this.plugin) return;
    const { vault } = this.plugin.app;
    const basePath = target.path;

    for (let i = 0; ; i++) {
      const filename = `Untitled${i === 0 ? '' : ` ${i}`}.${ext}`;
      const path = `${basePath}/${filename}`;

      if (await vault.exists(path)) continue;
      return await vault.create(path, content);
    }
  }

  async tryCreateDirs() {
    const dirPaths = [this.fontsDirNPath, this.packagesDirNPath];
    await Promise.allSettled(dirPaths.map((dirPath) => this.adapter.mkdir(dirPath)));
  }

  async collectFiles(baseDirPath: string, dirPath: string, map: Map<string, Uint8Array | undefined>): Promise<void> {
    const { filePaths, folderPaths } = await this.list(dirPath);

    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          let data: Uint8Array;
          if (features.node) {
            data = new Uint8Array(await fs!.promises.readFile(filePath));
          } else {
            data = new Uint8Array(await this.adapter.readBinary(filePath));
          }
          map.set(filePath.replace(baseDirPath, ''), data);
        } catch {}
      }),
    );

    for (const folderPath of folderPaths) await this.collectFiles(baseDirPath, folderPath, map);
  }

  private async list(dirPath: string) {
    let filePaths: string[] = [];
    let folderPaths: string[] = [];
    if (features.node) {
      const items = await fs!.promises.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path!.join(dirPath, item.name);
        if (item.isDirectory()) folderPaths.push(fullPath);
        else if (item.isFile()) filePaths.push(fullPath);
      }
    } else {
      const listedFiles = await this.adapter.list(dirPath);
      filePaths = listedFiles.files;
      folderPaths = listedFiles.folders;
    }

    return { filePaths, folderPaths };
  }

  private watcherSubscriptions: WatcherSubscription[] = [];

  async watchPackages(callback: (path: string) => void) {
    if (!features.watcher || !watcher) return;

    for (const subscription of this.watcherSubscriptions) await subscription.unsubscribe();
    this.watcherSubscriptions = [];

    this.watcherSubscriptions = await watcher.subscribe(this.packagesDirPaths, callback);
  }

  async getLoadImportedFonts(): Promise<string[]> {
    try {
      const result = await this.adapter.list(this.fontsDirNPath);
      const extensions = ['font', 'ttf', 'ttc', 'otf', 'otc'] as const;
      return result.files.filter((f) => extensions.some((ext) => f.endsWith(`.${ext}`)));
    } catch {
      return [];
    }
  }

  async collectFonts() {
    const { files } = await this.adapter.list(this.fontsDirNPath);
    const fontFiles = filterWithExtensions(files, ['font', 'ttf', 'ttc', 'otf', 'otc']);

    return fontFiles;
  }

  async collectPackages(path: string, isSystem: boolean): Promise<PackageSpec[]> {
    const listFolders = isSystem
      ? async (dir: string) =>
          (await fs?.promises.readdir(dir, { withFileTypes: true }))
            ?.filter((f) => f.isDirectory())
            .map((f) => f.name) ?? []
      : async (dir: string) => (await this.adapter.list(dir)).folders;

    const specs: PackageSpec[] = [];

    const namespaceFolders = await listFolders(path);
    for (const namespaceFolder of namespaceFolders) {
      const namespace = namespaceFolder.split('/').pop()!;

      const nameFolders = await listFolders(namespaceFolder);
      for (const nameFolder of nameFolders) {
        const name = nameFolder.split('/').pop()!;

        const versionFolders = await listFolders(nameFolder);
        for (const versionFolder of versionFolders) {
          const version = versionFolder.split('/').pop()!;

          specs.push({ namespace, name, version });
        }
      }
    }

    return specs;
  }

  async detach() {
    this.plugin = undefined;
    TypstMate.version = undefined;

    if (features.node) {
      await Promise.all(this.watcherSubscriptions.map((s) => s.unsubscribe()));
      this.watcherSubscriptions = [];
    }
  }
}

export const fileManager = new FileManager();
