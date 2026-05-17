import { TypstMate } from '@/api';
import { features, initWatcherNode, loadWatcherModule, path, watcher } from '@/libs/features';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { fileManager } from '../fileManager';
import { rendererManager } from '../rendererManager';

export class WatcherManager implements Singleton {
  async init(_: ObsidianTypstMate) {}

  async onLayoutReady() {
    if (!features.node) return;

    try {
      await this.ensureAndLoadWatcherModule();
      await this.ensureAndLoadWatcherNode();

      if (features.watcher) {
        await this.watchPackages();
      }
    } catch (e) {
      console.error('Failed to load watcher:', e);
    }
  }

  async ensureAndLoadWatcherModule() {
    const { adapter, pluginDirNPath, watcherModuleNPath } = fileManager;
    const files = (await adapter.list(pluginDirNPath)).files;

    const watchers = files.filter((npath) => npath.split('/').at(-1)!.startsWith('watcher-') && npath.endsWith('.js'));
    for (const f of watchers.filter((w) => w !== watcherModuleNPath)) await adapter.remove(f);

    if (!watchers.includes(watcherModuleNPath)) await fileManager.downloadAsset(watcherModuleNPath);

    loadWatcherModule(path!.join(fileManager.baseDirPath, watcherModuleNPath));
  }

  async ensureAndLoadWatcherNode() {
    if (!watcher) return;
    const { adapter, pluginDirNPath } = fileManager;
    const watcherNodeName = watcher.getName(TypstMate.pluginVersion!);
    const watcherNodeNPath = path!.join(pluginDirNPath, watcherNodeName);

    const files = (await adapter.list(pluginDirNPath)).files;

    const watchers = files.filter((file) => file.startsWith('watcher-') && file.endsWith('.node'));
    for (const f of watchers.filter((w) => w !== watcherNodeNPath)) await adapter.remove(f);
    if (!watchers.includes(watcherNodeNPath)) await fileManager.downloadAsset(watcherNodeNPath);

    initWatcherNode(path!.join(fileManager.baseDirPath, watcherNodeNPath));
  }

  async watchPackages() {
    if (!features.watcher || !watcher) return;

    await watcher.subscribe([fileManager.vaultPackagesDirNPath, ...fileManager.localPackagesDirPaths], (events) => {
      let shouldRefresh = false;
      for (const event of events) {
        if (event.path.endsWith('.typ')) {
          shouldRefresh = true;
          break;
        }
      }

      if (shouldRefresh) {
        rendererManager.refresh();
      }
    });
  }

  async detach() {
    if (features.watcher && watcher) {
      await watcher.unsubscribeAll();
    }
  }
}

export const watcherManager = new WatcherManager();
