import type ObsidianTypstMate from '@/main';
import { onCacheChanged } from './cache';
import { onCssChange } from './css-change';
import { onFileMenu, onLeafMenu } from './menu';
import { registerVimModeTracker } from './vim-mode-change';

export function registerEvents(plugin: ObsidianTypstMate) {
  const { workspace, metadataCache } = plugin.app;

  plugin.registerEvent(workspace.on('css-change', onCssChange));
  plugin.registerEvent(workspace.on('leaf-menu', onLeafMenu));
  plugin.registerEvent(workspace.on('file-menu', onFileMenu));

  plugin.registerEvent(metadataCache.on('changed', onCacheChanged));

  registerVimModeTracker(plugin);
}
