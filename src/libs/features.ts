import type fsModule from 'node:fs';
import type osModule from 'node:os';
import type pathModule from 'node:path';

import { Platform } from 'obsidian';

export let fs: typeof fsModule | undefined;
export let os: typeof osModule | undefined;
export let path: typeof pathModule | undefined;

export const features = {
  node: false,
  watcher: false,
  queryLocalFonts: false,
};

if (Platform.isDesktop) {
  try {
    fs = require('node:fs');
    os = require('node:os');
    path = require('node:path');
    features.node = true;
  } catch {}
}

export let watcher: typeof import('@typst-mate/watcher') | undefined;

export function loadWatcher(pluginFullPath: string, version: string, linuxLibc: 'glibc' | 'musl' = 'glibc') {
  if (!features.node || !path) return;

  try {
    const watcherModulePath = path.join(pluginFullPath, `watcher-${version}.js`);
    const watcherModule = require(watcherModulePath);

    if (watcherModule.load(pluginFullPath, version, linuxLibc)) {
      watcher = watcherModule;
      features.watcher = true;
    }
  } catch (e) {
    console.log(e);
  }
}

if (window.queryLocalFonts) features.queryLocalFonts = true;
