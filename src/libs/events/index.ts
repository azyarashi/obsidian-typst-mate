import type ObsidianTypstMate from '@/main';
import { onActiveLeafChange, onCacheChanged } from './cache';
import { onCssChange } from './css-change';
import { onFileMenu, onLeafMenu } from './menu';
import { onResize } from './resize';

export function registerEvents(plugin: ObsidianTypstMate) {
  const { workspace, metadataCache } = plugin.app;

  plugin.registerEvent(workspace.on('css-change', onCssChange));
  plugin.registerEvent(workspace.on('leaf-menu', onLeafMenu));
  plugin.registerEvent(workspace.on('file-menu', onFileMenu));

  plugin.registerEvent(metadataCache.on('changed', onCacheChanged));
  plugin.registerEvent(workspace.on('active-leaf-change', onActiveLeafChange));

  plugin.registerEvent(workspace.on('resize', onResize));
}
