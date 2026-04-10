import type { MarkdownView, WorkspaceLeaf } from 'obsidian';
import { appUtils, typstManager } from '@/libs';

export async function onActiveLeafChange(leaf: WorkspaceLeaf | null) {
  const { app } = appUtils;
  if (leaf?.view.getViewType() !== 'markdown') return;
  const path = (leaf?.view as MarkdownView).file?.path;
  if (!path) return;

  const cache = app.metadataCache.getCache(path);
  if (cache) typstManager.syncFileCache(cache);
}
