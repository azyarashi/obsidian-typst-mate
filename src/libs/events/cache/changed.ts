import type { TFile } from 'obsidian';
import { appUtils, rendererManager } from '@/libs';

export function onCacheChanged(file: TFile) {
  const { app } = appUtils;

  const cache = app.metadataCache.getCache(file.path);
  if (!cache) return;

  if (rendererManager.syncFileCache(cache)) rendererManager.rerenderAll();
}
