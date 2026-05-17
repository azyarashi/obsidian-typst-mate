import type { TFile } from 'obsidian';
import { appUtils, metadataManager, rendererManager } from '@/libs';

export function onCacheChanged(file: TFile) {
  // TODO
  const { app } = appUtils;

  const cache = app.metadataCache.getCache(file.path);
  if (!cache) return;

  if (metadataManager.syncFileCache(file.path, cache)) rendererManager.rerenderAll();
}
