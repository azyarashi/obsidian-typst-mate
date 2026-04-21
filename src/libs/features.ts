import type fsModule from 'node:fs';
import type osModule from 'node:os';
import type pathModule from 'node:path';
import { Platform } from 'obsidian';
import { appUtils } from './appUtils';

export let fs: typeof fsModule | undefined;
export let os: typeof osModule | undefined;
export let path: typeof pathModule | undefined;

export const features = {
  node: false,
  watcher: false,
  queryLocalFonts: false,
  excalidraw: false,
  latexSuite: false,
  noMoreFlickeringInlineMath: false,
};
export type Features = typeof features;

if (Platform.isDesktop) {
  try {
    fs = require('node:fs');
    os = require('node:os');
    path = require('node:path');
    features.node = true;
  } catch {}
}

export let watcher: typeof import('@typst-mate/watcher') | undefined;
export function loadWatcherModule(watcherModulePath: string): boolean {
  if (!features.node || !path) return false;

  try {
    const watcherModule = require(watcherModulePath) as typeof import('@typst-mate/watcher');
    watcher = watcherModule;
    return true;
  } catch {
    return false;
  }
}
export function initWatcherNode(watcherNodePath: string): boolean {
  if (!watcher) return false;

  try {
    if (!watcher.load(watcherNodePath)) return false;
    features.watcher = true;
    return true;
  } catch {
    return false;
  }
}

export function checkPluginFeatures() {
  features.excalidraw = appUtils.app.plugins.enabledPlugins.has('obsidian-excalidraw-plugin');
  features.latexSuite = appUtils.app.plugins.enabledPlugins.has('obsidian-latex-suite');
  features.noMoreFlickeringInlineMath = appUtils.app.plugins.enabledPlugins.has('inline-math');
}

async function checkQueryLocalFontsFeature(): Promise<boolean> {
  if (typeof window.queryLocalFonts !== 'function') return false;

  try {
    return 0 < (await window.queryLocalFonts()).length;
  } catch {
    return false;
  }
}

checkQueryLocalFontsFeature().then((result) => {
  features.queryLocalFonts = result;
});
