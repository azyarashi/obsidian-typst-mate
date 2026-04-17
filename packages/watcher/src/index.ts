import * as path from 'node:path';
import type watcherModule from '@parcel/watcher';

type Event = watcherModule.Event;

export interface WatcherOptions {
  ignore?: string[];
}

export interface WatcherSubscription {
  unsubscribe(): Promise<void>;
}

let watcher: typeof watcherModule | undefined;
const activeSubscriptions = new Map<string, WatcherSubscription>();

export function detectLibc(): 'glibc' | 'musl' {
  try {
    const { execSync } = require('node:child_process');
    const out = execSync('ldd --version', { encoding: 'utf8' });
    return out.toLowerCase().includes('musl') ? 'musl' : 'glibc';
  } catch {
    return 'glibc';
  }
}

export function load(pluginFullPath: string, version: string): boolean {
  try {
    const { createWrapper } = require('@parcel/watcher/wrapper');

    let name = `watcher-${process.platform}-${process.arch}`;
    if (process.platform === 'linux') name += `-${detectLibc()}`;
    name += `-${version}.node`;

    const binding = require(path.join(pluginFullPath, name));
    watcher = createWrapper(binding);
    return true;
  } catch {
    return false;
  }
}

export function getSubscriptionPaths(): string[] {
  return Array.from(activeSubscriptions.keys());
}

export async function unsubscribe(path: string): Promise<boolean> {
  const subscription = activeSubscriptions.get(path);
  if (subscription) {
    await subscription.unsubscribe();
    activeSubscriptions.delete(path);
    return true;
  }
  return false;
}

export async function unsubscribeAll(): Promise<void> {
  const promises = Array.from(activeSubscriptions.values()).map((subscription) => subscription.unsubscribe());
  await Promise.all(promises);
  activeSubscriptions.clear();
}

export async function subscribe(
  paths: string | string[],
  callback: (events: Event[]) => void,
  options?: WatcherOptions,
): Promise<WatcherSubscription[]> {
  if (!watcher) return [];

  const pathList = Array.isArray(paths) ? paths : [paths];
  const promises = pathList.map(async (p) => {
    await unsubscribe(p);
    const subscription = await watcher!.subscribe(
      p,
      (err, events) => {
        if (err) return;
        callback(events);
      },
      options,
    );

    activeSubscriptions.set(p, subscription);
    return subscription;
  });

  return await Promise.all(promises);
}

/** TODO
export async function getEventsSince(
  dirPath: string,
  snapshotPath: string,
  options?: WatcherOptions,
): Promise<Event[]> {
  if (!watcher) return [];
  return await watcher.getEventsSince(dirPath, snapshotPath, options);
}

export async function writeSnapshot(dirPath: string, snapshotPath: string, options?: WatcherOptions): Promise<void> {
  if (!watcher) return;
  await watcher.writeSnapshot(dirPath, snapshotPath, options);
}
*/
