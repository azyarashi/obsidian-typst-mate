/**
 * File/package resolver for the Typst WASM world.
 *
 * Extracted from src/libs/worker.ts so that the fetch logic is unit-testable
 * without importing the WASM module or running a Web Worker.
 *
 * Error codes thrown here are consumed by wasm/src/world.rs `fetch_file()`:
 *   0  — implementation constraints (async reader; caller must await `pending` then retry)
 *  12  — FileError::NotFound
 *  20  — PackageError::MalformedArchive
 *  21  — PackageError::NetworkFailed
 *  22  — PackageError::NotFound (package-level)
 */

import type fsModule from 'node:fs';
import pako from 'pako';
import untar from 'untar-sync';
import type { Main } from './worker';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A minimal XMLHttpRequest-like surface used by fetchFile.
 * Exists as a named interface so tests can inject a fake without a real browser.
 */
export interface XhrLike {
  open(method: string, url: string, async: boolean): void;
  send(body: null): void;
  status: number;
  responseText: string;
}

/** All external dependencies of fetchFile, injected explicitly for testability. */
export interface FetchDeps {
  /** In-memory VFS cache shared across all fetch calls in a session. */
  map: Map<string, Uint8Array | undefined>;
  /** Node `fs` module (desktop only). Absent on mobile. */
  fs?: Pick<typeof fsModule, 'readFileSync'>;
  /** Plugin main-thread callback object (notices, binary reads, package writes). */
  main: Main;
  /** Ordered list of local Typst package directory paths to search. */
  localPackagesDirPaths: string[];
  /**
   * Absolute path to the vault root on disk (desktop).
   * Empty string on mobile where the adapter uses vault-relative paths.
   */
  baseDirPath: string;
  /**
   * Live set of in-flight async reads.
   * When fetchFile throws 0 (implementation constraints), it has queued a
   * Promise here.  Callers must `await Promise.all([...pending])` and then
   * retry compilation so the file is found from cache on the next attempt.
   */
  pending: Set<Promise<void>>;
  /**
   * Factory for XMLHttpRequest-like objects.
   * Defaults to `() => new XMLHttpRequest()`.
   * Override in tests to avoid real network requests.
   */
  createXhr?: () => XhrLike;
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Resolve a file/package path requested by the Typst WASM world.
 *
 * Returns the raw bytes for the requested path, or throws a numeric code.
 * Numeric codes are intentional — they are caught by the Rust WASM glue in
 * wasm/src/world.rs and converted to typed `FileError` / `PackageError` values.
 */
export function fetchFile(rawPath: string, deps: FetchDeps): Uint8Array {
  const { map, fs, main, localPackagesDirPaths, baseDirPath, pending } = deps;
  const createXhr = deps.createXhr ?? (() => new XMLHttpRequest() as XhrLike);

  // ── Cache hit ────────────────────────────────────────────────────────────
  if (map.has(rawPath)) {
    const v = map.get(rawPath);
    if (v) return v;
    throw 12; // FileError::NotFound (negative cache entry)
  }

  // ── readBinary helper ────────────────────────────────────────────────────
  /**
   * Read `rpath` from disk (sync fs) or the async adapter.
   * On success, caches the result under `vpath` and returns bytes.
   * On async result, queues in `pending` and throws 0.
   * On sync read failure, throws 12 (NotFound).
   */
  const readBinary = (vpath: string, rpath: string): Uint8Array => {
    const f = fs?.readFileSync ?? main.readBinary;
    let result: Uint8Array | ArrayBuffer | Buffer | Promise<ArrayBuffer>;
    try {
      result = f(rpath) as typeof result;
    } catch {
      throw 12; // ENOENT or any sync read failure → FileError::NotFound
    }

    if (result instanceof Promise) {
      const p = result
        .then((r) => {
          map.set(vpath, new Uint8Array(r));
        })
        .catch(() => {
          if (!map.has(vpath)) map.set(vpath, undefined);
        });
      pending.add(p);
      p.finally(() => pending.delete(p));
      throw 0; // implementation constraints — caller must await pending then retry
    }

    const bytes = new Uint8Array(result as ArrayBuffer);
    map.set(vpath, bytes);
    return bytes;
  };

  // ── Package path (@preview/..., @local/..., etc.) ───────────────────────
  if (rawPath.startsWith('@')) {
    const path = rawPath.slice(1); // strip leading '@'
    const parts = path.split('/');
    const [namespace, name, version] = parts;
    const vpath = parts.slice(3).join('/'); // file path within the package
    const p = `${namespace}/${name}/${version}`;

    if (namespace === 'preview') {
      // 1. Try local package cache first (desktop only — sync, no network).
      if (fs) {
        try {
          return readBinary(rawPath, `${localPackagesDirPaths[0]}/${p}/${vpath}`);
        } catch (err) {
          if (err === 0) throw err; // async sentinel — shouldn't happen with fs set
          // 12 (not found) or ENOENT: fall through to network download
        }
      }

      // 2. Download from packages.typst.org.
      if (vpath === 'typst.toml') main.notice(`Downloading ${name}...`, 500);

      const xhr = createXhr();
      xhr.open('GET', `https://packages.typst.org/preview/${name}-${version}.tar.gz`, false);
      xhr.send(null);

      if (xhr.status === 0) throw 21;   // PackageError::NetworkFailed
      if (xhr.status === 404) throw 22; // PackageError::NotFound
      if (xhr.status !== 200) throw 20; // PackageError::MalformedArchive (403, 500, …)

      try {
        const text = xhr.responseText;
        const targzArr = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
          targzArr[i] = text.charCodeAt(i) & 0xff;
        }

        const tarArr = pako.ungzip(targzArr).buffer;
        const files = untar(tarArr) as tarFile[];
        main.writePackage(p, files);

        for (const file of files.filter((f) => f.type === '0')) {
          map.set(`@${p}/${file.name}`, new Uint8Array(file.buffer));
        }
        for (const file of files.filter((f) => f.type === '2')) {
          map.set(
            `@${p}/${file.name}`,
            new Uint8Array(map.get(file.linkname!)?.buffer ?? new ArrayBuffer(0)),
          );
        }

        if (vpath === 'typst.toml') main.notice('Downloaded successfully!', 500);
      } catch (e) {
        console.error(e);
        throw 20; // PackageError::MalformedArchive
      }

      const cached = map.get(rawPath);
      if (cached === undefined) throw 12; // file not present in the tarball
      return cached;
    }

    // Non-preview packages (@local, @typst, …): search all local package dirs.
    for (const localDir of localPackagesDirPaths) {
      try {
        return readBinary(rawPath, `${localDir}/${path}`);
      } catch (err) {
        if (err === 0) throw err; // async sentinel — propagate immediately
        // 12 (not found): try the next directory
      }
    }
    throw 22; // PackageError::NotFound — all local dirs exhausted
  }

  // ── Vault-relative file ──────────────────────────────────────────────────
  // The WASM world encodes vault paths with a leading '/' via as_rooted_path().
  // Example: #import "notes/mylib.typ" → rawPath = '/notes/mylib.typ'
  //
  // On desktop, baseDirPath is the vault's absolute FS path (e.g. '/home/user/Vault').
  // Concatenating gives the real disk path: baseDirPath + rawPath
  //   = '/home/user/Vault' + '/notes/mylib.typ'
  //   = '/home/user/Vault/notes/mylib.typ'  ✓
  //
  // On mobile, baseDirPath is '' so rawPath is passed as-is to the adapter.
  return readBinary(rawPath, baseDirPath + rawPath);
}
