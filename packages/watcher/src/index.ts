import * as path from 'node:path';
import type watcherModule from '@parcel/watcher';
import { createWrapper } from './wrapper';

type Event = watcherModule.Event;

export interface WatcherOptions {
  ignore?: string[];
}

let watcher: typeof watcherModule | undefined;
const activeSubscriptions = new Map<string, watcherModule.AsyncSubscription>();

type Libc = 'glibc' | 'musl';
export function detectLibc(): Libc {
  try {
    const { MUSL, familySync } = require('detect-libc');
    const family = familySync();
    if (family === MUSL) return 'musl';
    return 'glibc';
  } catch {
    return 'glibc';
  }
}

export function getPlatform(): { platform: string; arch: string; libc?: Libc } {
  const { platform, arch } = process;
  const libc = platform === 'linux' ? detectLibc() : undefined;
  return { platform, arch, libc };
}

export function getName(version: string): string {
  let name = `watcher-${process.platform}-${process.arch}`;
  if (process.platform === 'linux') name += `-${detectLibc()}`;
  name += `-${version}.node`;
  return name;
}

export function load(pluginFullPath: string, version: string): boolean {
  try {
    const name = getName(version);
    const binding = require(path.join(pluginFullPath, name));
    watcher = createWrapper(binding);
    return true;
  } catch {
    return false;
  }
}

export async function subscribe(
  paths: string | string[],
  callback: (events: Event[]) => void,
  options?: WatcherOptions,
): Promise<watcherModule.AsyncSubscription[]> {
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

export function getSubscriptionPaths(): string[] {
  return Array.from(activeSubscriptions.keys());
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
