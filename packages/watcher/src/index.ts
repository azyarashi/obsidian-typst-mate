import * as fs from 'node:fs';
import * as path from 'node:path';

import type watcherModule from '@parcel/watcher';

export interface WatcherSubscription {
  unsubscribe(): Promise<void>;
}

let watcher: typeof watcherModule | undefined;

export function load(pluginFullPath: string, version: string, linuxLibc: 'glibc' | 'musl' = 'glibc'): boolean {
  try {
    const { createWrapper } = require('@parcel/watcher/wrapper');

    let name = `watcher-${process.platform}-${process.arch}`;
    if (process.platform === 'linux') name += `-${linuxLibc}`;
    name += `-${version}.node`;

    const binding = require(path.join(pluginFullPath, name));
    watcher = createWrapper(binding);
    return true;
  } catch {
    return false;
  }
}

export async function subscribe(paths: string[], callback: (path: string) => void): Promise<WatcherSubscription[]> {
  if (!watcher) return [];

  const promises = paths
    .filter((p) => fs.existsSync(p))
    .map((p) =>
      watcher!.subscribe(p, (err, events) => {
        if (err) return;
        for (const event of events) {
          if (event.type === 'update' || event.type === 'create' || event.type === 'delete') {
            callback(event.path);
          }
        }
      }),
    );

  return await Promise.all(promises);
}
