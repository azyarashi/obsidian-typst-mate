import type { MarkdownView, WorkspaceLeaf } from 'obsidian';
import { appUtils, rendererManager } from '@/libs';

export async function onActiveLeafChange(leaf: WorkspaceLeaf | null) {
  const { app } = appUtils;

  const view = leaf?.view as MarkdownView | undefined;
  if (view?.getViewType() !== 'markdown') return;
  console.log(view);

  // * viewport
  requestAnimationFrame(() => {
    const width = rendererManager.getNoteWidth(view);
    rendererManager.wasm.setViewportWidth(width);
    rendererManager.wasm.updateVariables();
  });

  // * cache
  const path = view.file?.path;
  if (!path) return;
  const cache = app.metadataCache.getCache(path);
  if (cache) rendererManager.syncFileCache(cache);
}
