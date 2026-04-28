import type { Subscription } from '@typst-mate/watcher';
import {
  type DataAdapter,
  type FileSystemAdapter,
  Notice,
  Platform,
  requestUrl,
  type TFile,
  type TFolder,
} from 'obsidian';
import type { PackageSpec } from '@/../pkg/typst_wasm';
import { TypstMate } from '@/api';
import { t } from '@/i18n';
import { features, fs, initWatcherNode, loadWatcherModule, os, path, watcher } from '@/libs/features';
import ObsidianTypstMate from '@/main';
import type { GitHubAsset, PackageAsset } from '@/types/global';
import type { Singleton } from '@/types/singleton';
import type { VPath } from '../typstManager/worker';
import { arrayBufferLikeToArrayBuffer, filterWithExtensions } from './utils';

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
  pluginDirPath!: string;

  wasmNPath!: string;
  watcherModuleNPath!: string;
  watcherNodeNPath!: string;

  fontsDirNPath!: string;
  vaultPackagesDirNPath!: string;
  // TODO: vaultPackagesDirNPaths!: string;
  localPackagesDirPaths: string[] = [];

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    this.adapter = plugin.app.vault.adapter;

    // @ts-expect-error
    this.baseDirPath = features.node ? this.adapter.basePath : '';

    this.pluginDirNPath = `${this.plugin.app.vault.configDir}/plugins/${ObsidianTypstMate.id}`;

    this.wasmNPath = `${this.pluginDirNPath}/typst-${TypstMate.pluginVersion}.wasm`;
    this.watcherModuleNPath = `${this.pluginDirNPath}/watcher-${TypstMate.pluginVersion}.js`;

    this.fontsDirNPath = `${this.pluginDirNPath}/fonts`;
    this.vaultPackagesDirNPath = `${this.pluginDirNPath}/packages`;

    if (features.node) {
      this.setLocalPackagesDirPath();
      this.pluginDirPath = (this.adapter as FileSystemAdapter).getFullPath(this.pluginDirNPath);
    }
  }

  /**
   * 1. vault
   * 2. data
   * 3. cache
   * @see https://github.com/typst/packages
   */
  private setLocalPackagesDirPath() {
    const homedir = os!.homedir();

    const dataDirsCandidates: string[] = [];
    switch (true) {
      case Platform.isLinux: {
        dataDirsCandidates.push(process.env.XDG_DATA_HOME ?? path!.join(homedir, '.local', 'share'));
        dataDirsCandidates.push(process.env.XDG_CACHE_HOME ?? path!.join(homedir, '.cache'));
        break;
      }
      case Platform.isMacOS: {
        dataDirsCandidates.push(path!.join(homedir, 'Library', 'Application Support'));
        dataDirsCandidates.push(path!.join(homedir, 'Library', 'Caches'));
        break;
      }
      case Platform.isWin: {
        dataDirsCandidates.push(process.env.APPDATA ?? path!.join(homedir, 'AppData', 'Roaming'));
        dataDirsCandidates.push(process.env.LOCALAPPDATA ?? path!.join(homedir, 'AppData', 'Local'));

        break;
      }
    }

    this.localPackagesDirPaths = dataDirsCandidates
      .map((dirPath) => path!.join(dirPath, 'typst', 'packages'))
      .filter((path) => fs!.existsSync(path));
  }

  async ensureWasm(files: string[]) {
    const wasms = files.filter((file) => file.endsWith('.wasm'));
    for (const f of wasms.filter((wasm) => wasm !== this.wasmNPath)) await this.adapter.remove(f);
    if (!wasms.includes(this.wasmNPath)) await this.downloadAsset(this.wasmNPath);
  }

  async ensureAndLoadWatcherModule() {
    const files = (await this.adapter.list(this.pluginDirNPath)).files;

    const watchers = files.filter((file) => file.startsWith('watcher-'));
    for (const f of watchers.filter((w) => w !== this.watcherModuleNPath)) await this.adapter.remove(f);
    if (!watchers.includes(this.watcherModuleNPath)) await this.downloadAsset(this.watcherModuleNPath);

    const watcherModulePath = path!.join(this.pluginDirNPath, watcher!.getName(TypstMate.pluginVersion!));
    loadWatcherModule(watcherModulePath);
    this.watcherNodeNPath = path!.join(this.pluginDirNPath, watcher!.getName(TypstMate.pluginVersion!));
  }

  async ensureAndLoadWatcherNode() {
    const files = (await this.adapter.list(this.pluginDirNPath)).files;

    const watchers = files.filter((file) => file.startsWith('watcher-'));
    for (const f of watchers.filter((w) => w !== this.watcherNodeNPath)) await this.adapter.remove(f);
    if (!watchers.includes(this.watcherNodeNPath)) await this.downloadAsset(this.watcherNodeNPath);

    const watcherNodePath = path!.join(this.pluginDirNPath, watcher!.getName(TypstMate.pluginVersion!));
    initWatcherNode(watcherNodePath);
  }

  async downloadAsset(targetPath: string) {
    const filename = targetPath.split('/').pop()!;
    new Notice(t('notices.downloadingAsset', { asset: filename }));

    // 最新の Asset がある URL を取得する
    const releaseUrl = `https://api.github.com/repos/azyarashi/obsidian-typst-mate/releases/tags/${TypstMate.pluginVersion}`;
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

  async writePackage(spec: PackageSpec, files: PackageAsset) {
    const packageDirNPath = `${this.vaultPackagesDirNPath}/${spec.namespace}/${spec.name}/${spec.version}`;
    // ディレクトリ
    for (const folder of files.filter((f) => f.type === '5')) {
      await this.adapter.mkdir(`${packageDirNPath}/${folder.name}`);
    }

    // ファイル
    for (const file of files.filter((f) => f.type === '0')) {
      await this.adapter.writeBinary(`${packageDirNPath}/${file.name}`, file.buffer);
    }

    // シンボリックリンク
    for (const file of files.filter((f) => f.type === '2')) {
      await this.adapter.copy(`${packageDirNPath}/${file.name}`, `${packageDirNPath}/${file.linkname}`);
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
    const dirPaths = [this.fontsDirNPath, this.vaultPackagesDirNPath];
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

  getFilename(vpath: VPath) {
    if (features.node && path!.isAbsolute(vpath)) return path!.basename(vpath);

    return vpath.split('/').pop()!;
  }

  getBasename(vpath: VPath, ext = '.typ') {
    if (features.node && path!.isAbsolute(vpath)) return path!.basename(vpath, ext);

    const filename = vpath.split('/').pop()!;
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
  }

  getDirname(vpath: VPath) {
    if (features.node && path!.isAbsolute(vpath)) return path!.dirname(vpath);

    const lastSlashIndex = vpath.lastIndexOf('/');
    return lastSlashIndex === -1 ? '' : vpath.slice(0, lastSlashIndex);
  }

  join(vpath: VPath, filename: string): string {
    const parentPath = this.getDirname(vpath);
    if (features.node && path!.isAbsolute(vpath)) return path!.join(parentPath, filename);
    return parentPath ? `${parentPath}/${filename}` : filename;
  }

  async writeUint8Array(vpath: VPath, data: Uint8Array) {
    if (features.node && path!.isAbsolute(vpath)) await fs!.promises.writeFile(vpath, data);
    else await this.adapter.writeBinary(vpath, arrayBufferLikeToArrayBuffer(data));
  }

  async writeArrayBuffer(vpath: VPath, data: ArrayBuffer) {
    if (features.node && path!.isAbsolute(vpath)) await fs!.promises.writeFile(vpath, Buffer.from(data));
    else await this.adapter.writeBinary(vpath, data);
  }

  async writeString(vpath: VPath, data: string) {
    if (features.node && path!.isAbsolute(vpath)) await fs!.promises.writeFile(vpath, data);
    else await this.adapter.write(vpath, data);
  }

  replaceExtension(vpath: VPath, ext: string) {
    const lastDotIndex = vpath.lastIndexOf('.');
    if (lastDotIndex === -1) return `${vpath}.${ext}`;
    return `${vpath.slice(0, lastDotIndex)}.${ext}`;
  }

  private watcherSubscriptions: Subscription[] = [];
  async watchPackages(callback: (path: string) => void) {
    if (!features.watcher || !watcher) return;

    for (const subscription of this.watcherSubscriptions) await subscription.unsubscribe();
    this.watcherSubscriptions = [];

    this.watcherSubscriptions = await watcher.subscribe(
      [this.vaultPackagesDirNPath, ...this.localPackagesDirPaths],
      (events) => {
        for (const event of events) {
          callback(event.path);
        }
      },
    );
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

    if (features.node) {
      await Promise.all(this.watcherSubscriptions.map((s) => s.unsubscribe()));
      this.watcherSubscriptions = [];
    }
  }
}

export const fileManager = new FileManager();
