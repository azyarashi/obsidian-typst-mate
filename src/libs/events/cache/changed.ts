import type { TFile } from 'obsidian';
import { appUtils, typstManager } from '@/libs';

export function onCacheChanged(file: TFile) {
  const { app } = appUtils;

  const cache = app.metadataCache.getCache(file.path);
  if (!cache) return;

  if (typstManager.syncFileCache(cache)) typstManager.rerenderAll();
}
