// biome-ignore assist/source/organizeImports: 可読性のため
import type fsModule from 'node:fs';
import type pathModule from 'node:path';
import { expose } from 'comlink';
import type { TarFile } from 'untar-sync';
import untar from 'untar-sync';
import init, { Wasm } from './../../../pkg/typst_wasm.js';
import type { Features } from '../features';

// wasm types

// markdown
import type { HtmlMResult, SvgMResult } from './../../../pkg/typst_wasm.js';
// preview
import type { SvgPResult } from './../../../pkg/typst_wasm.js';
// export
// biome-ignore format: 可読性のため
import type { SvgEOptions, SvgEResult, HtmlEOptions, HtmlEResult, PdfEOptions, PdfEResult, PngEOptions, PngEResult } from './../../../pkg/typst_wasm.js';
// その他
import type { FontInfo, FormatOptions, FormatResult, PackageSpec } from './../../../pkg/typst_wasm.js';

/**
 * * Mobile App: normalized path
 * * Desktop App: absolute path (os-native path format)
 */
export type VPath = string;
type FileMap = Map<VPath, Uint8Array | undefined>;

const fileMap: FileMap = new Map();
const packagesMap: Map<VPath, FileMap> = new Map();
const obsidianResultsCache: Map<string, unknown> = new Map();

export default class WasmAdapter {
  private wasm?: Wasm;
  private main!: Main;

  baseDirPath: string;
  vaultPackagesDirNPath: string;
  localPackagesDirPaths: string[];
  private inFlightDownloads: Set<string> = new Set();
  private pendings: Promise<unknown>[] = [];

  private fs?: typeof fsModule;
  private path?: typeof pathModule;
  private shouldReadLocalPackages: boolean;

  getFullPath: (dirPathOrDirNPath: string, filename: string) => string = (a, b) => `${a}/${b}`;

  // * Initialization

  constructor(baseDirPath: string, vaultPackagesDirNPath: string, localPackagesDirPaths: string[], features: Features) {
    this.baseDirPath = baseDirPath;
    this.vaultPackagesDirNPath = vaultPackagesDirNPath;
    this.localPackagesDirPaths = localPackagesDirPaths;

    if (features.node) {
      // biome-ignore lint/security/noGlobalEval: to use require in worker
      // biome-ignore lint/complexity/noCommaOperator: to use require in worker with safely
      const req = (0, eval)('require');
      this.fs = req('node:fs');
      this.path = req('node:path');

      this.getFullPath = (ndir, filename) => this.path!.join(this.baseDirPath, ndir, filename);
    }

    this.shouldReadLocalPackages = features.node && this.localPackagesDirPaths.length !== 0;
  }

  async free() {
    this.wasm?.free();
  }

  // post
  async init(wasm: ArrayBuffer, fontsize: number, offset: number): Promise<void> {
    this.free();
    await init({
      module_or_path: await WebAssembly.compile(wasm),
    });
    this.wasm = new Wasm(
      this.readFile.bind(this),
      this.readPackageFile.bind(this),
      this.downloadPackage.bind(this),
      fontsize,
      offset,
    );
  }

  store(args: Args): void {
    const files: Map<string, string> = new Map();
    if (args.files) for (const [p, t] of args.files) files.set(p, t);
    this.wasm!.store(args.fonts ?? [], files);
  }

  setOffset(offset: number): void {
    this.wasm!.set_offset(offset);
  }

  // * get

  get_pdf_standards(): Record<string, string> {
    return this.wasm!.get_pdf_standards();
  }

  clearCache(path?: string): void {
    if (path) {
      if (path.startsWith('@')) {
        const match = path.match(/^@([^/]+\/[^/]+\/[^/]+)\/(.+)$/);
        if (match) {
          const [, pkgKey, vpath] = match;
          packagesMap.get(pkgKey!)?.delete(vpath!);
          return;
        }
      }

      if (fileMap.has(path)) {
        fileMap.delete(path);
        return;
      }

      for (const key of fileMap.keys()) {
        if (key === path || (path as string).endsWith(key)) fileMap.delete(key);
      }
    } else {
      fileMap.clear();
      packagesMap.clear();
      obsidianResultsCache.clear();
    }
  }

  listFonts(): FontInfo[] {
    return this.wasm!.list_fonts();
  }

  parseFont(font: ArrayBuffer): FontInfo[] {
    return this.wasm!.get_font_info(font);
  }

  listPackages(): PackageSpec[] {
    return this.wasm!.list_packages();
  }

  latex_to_typst(code: string): string {
    return this.wasm!.latex_to_typst(code);
  }
  typst_to_latex(code: string): string {
    return this.wasm!.typst_to_latex(code);
  }

  latexeq_to_typm(code: string): string {
    return this.wasm!.latexeq_to_typm(code);
  }
  typm_to_latexeq(code: string): string {
    return this.wasm!.typm_to_latexeq(code);
  }

  tikz_to_cetz(code: string): string {
    return this.wasm!.tikz_to_cetz(code);
  }
  cetz_to_tikz(code: string): string {
    return this.wasm!.cetz_to_tikz(code);
  }

  format(code: string, options: FormatOptions): FormatResult {
    return this.wasm!.format(code, options);
  }

  async formatAsync(code: string, options: FormatOptions): Promise<FormatResult> {
    return this.compileWithRetry(() => this.wasm!.format(code, options));
  }

  autocomplete(cursor: number, code: string) {
    return this.wasm!.autocomplete(cursor, code);
  }

  async autocompleteAsync(cursor: number, code: string) {
    return this.compileWithRetry(() => this.wasm!.autocomplete(cursor, code));
  }

  tooltip(cursor: number, code: string, sideAfter: boolean) {
    return this.wasm!.tooltip(cursor, code, sideAfter);
  }

  async tooltipAsync(cursor: number, code: string, sideAfter: boolean) {
    return this.compileWithRetry(() => this.wasm!.tooltip(cursor, code, sideAfter));
  }

  definition(cursor: number, code: string, sideAfter: boolean) {
    return this.wasm!.definition(cursor, code, sideAfter);
  }

  async definitionAsync(cursor: number, code: string, sideAfter: boolean) {
    return this.compileWithRetry(() => this.wasm!.definition(cursor, code, sideAfter));
  }

  jumpFromClick(x: number, y: number) {
    return this.wasm!.jump_from_clickm(x, y);
  }

  async jumpFromClickAsync(x: number, y: number) {
    return this.compileWithRetry(() => this.wasm!.jump_from_clickm(x, y));
  }

  jumpFromClickP(page: number, x: number, y: number) {
    return this.wasm!.jump_from_clickp(page, x, y);
  }

  async jumpFromClickPAsync(page: number, x: number, y: number) {
    return this.compileWithRetry(() => this.wasm!.jump_from_clickp(page, x, y));
  }

  jumpFromCursorP(cursor: number) {
    return this.wasm!.jump_from_cursorp(cursor);
  }

  async jumpFromCursorPAsync(cursor: number) {
    return this.compileWithRetry(() => this.wasm!.jump_from_cursorp(cursor));
  }

  readFile(pathOrNPath: string): Uint8Array {
    // キャッシュの確認
    if (fileMap.has(pathOrNPath)) {
      const v = fileMap.get(pathOrNPath);
      if (v) return v;
      throw ErrorCode.FileErrorNotFound;
    }

    const result = (this.fs?.readFileSync ?? this.main.readBinary)(pathOrNPath);

    if (result instanceof Promise) {
      this.pendings.push(
        result
          .then((r) => {
            fileMap.set(pathOrNPath, new Uint8Array(r));
          })
          .catch(() => {
            fileMap.set(pathOrNPath, undefined);
          }),
      );
      throw ErrorCode.Pending;
    }

    const v = new Uint8Array(result);
    fileMap.set(pathOrNPath, v);

    return v;
  }

  readPackageFile(spec: PackageSpec, vpath: string): Uint8Array {
    const specKey = `${spec.namespace}/${spec.name}/${spec.version}`;
    let packageMap = packagesMap.get(specKey);
    if (!packageMap) {
      packageMap = new Map();
      packagesMap.set(specKey, packageMap);
    }

    if (packageMap.has(vpath)) {
      const data = packageMap.get(vpath);
      if (data) return data;
      throw ErrorCode.FileErrorNotFound;
    }

    // ダウンロード中
    if (this.inFlightDownloads.has(specKey)) throw ErrorCode.Pending;

    // 1. Vault
    try {
      const pathOrNPath = this.fs
        ? this.path!.join(this.vaultPackagesDirNPath, `${specKey}/${vpath}`)
        : `${specKey}/${vpath}`;

      const result = (this.fs?.readFileSync ?? this.main.readBinary)(pathOrNPath);
      if (result instanceof Promise) {
        this.pendings.push(
          result
            .then((r) => {
              packageMap.set(vpath, new Uint8Array(r));
            })
            .catch(() => {
              if (!this.shouldReadLocalPackages) packageMap.set(vpath, undefined);
            }),
        );
        throw ErrorCode.Pending;
      }

      const data = new Uint8Array(result);
      packageMap.set(vpath, data);
      return data;
    } catch (e) {
      if (!this.shouldReadLocalPackages) {
        packageMap.set(vpath, undefined);

        if (e === ErrorCode.Pending) throw e;
        else throw ErrorCode.FileErrorNotFound;
      }
    }

    // 2. Local
    for (const localPackagesDirPath of this.localPackagesDirPaths) {
      const path = this.path!.join(localPackagesDirPath, specKey, vpath);

      try {
        const result = this.fs!.readFileSync(path);
        const data = new Uint8Array(result);
        packageMap.set(vpath, data);
        return data;
      } catch {}
    }

    packageMap.set(vpath, undefined);
    throw ErrorCode.FileErrorNotFound;
  }

  downloadPackage(spec: PackageSpec): void {
    const pkgKey = `${spec.namespace}/${spec.name}/${spec.version}`;
    if (this.inFlightDownloads.has(pkgKey)) return;
    this.inFlightDownloads.add(pkgKey);

    this.main.notice(`Downloading ${spec.name}...`, 500);

    this.pendings.push(
      this.main
        .fetchPackage(spec)
        .then(async (tarGzBuffer) => {
          const ds = new DecompressionStream('gzip');
          const decompressedStream = new Response(tarGzBuffer).body!.pipeThrough(ds);
          const tarArr = await new Response(decompressedStream).arrayBuffer();

          const files = untar(tarArr);

          await this.main.writePackage(spec, files);

          let packageMap = packagesMap.get(pkgKey);
          if (!packageMap) {
            packageMap = new Map();
            packagesMap.set(pkgKey, packageMap);
          }

          // 通常ファイルを格納
          for (const f of files.filter((f) => f.type === '0')) packageMap.set(f.name, new Uint8Array(f.buffer));
          // シンボリックリンクを展開
          for (const f of files.filter((f) => f.type === '2')) packageMap.set(f.name, packageMap.get(f.linkname!));

          this.main.notice('Downloaded successfully!', 500);
        })
        .catch((e) => {
          console.error('[typst-mate] package download failed:', e);
        })
        .finally(() => {
          this.inFlightDownloads.delete(pkgKey);
        }),
    );
  }

  version(): string | undefined {
    return this.wasm!.get_typst_version()?.version;
  }

  setMain(m: Main): void {
    this.main = m;
  }

  private async compileWithRetry<T>(compile: () => T): Promise<T> {
    for (let i = 0; i < 100000; i++) {
      try {
        return compile();
      } catch (e) {
        if (!this.wasm?.take_pending()) throw e;

        const toWait = this.pendings.splice(0);
        if (0 < toWait.length) await Promise.all(toWait);
        else await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return compile();
  }

  private withStatus<T>(message: string, fn: () => T): T {
    this.main.updateStatus({ isRendering: true, message });

    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then((r) => {
            return r;
          })
          .catch((e) => {
            throw e;
          })
          .finally(() => {
            this.main.updateStatus({ isRendering: false });
          }) as T;
      }

      this.main.updateStatus({ isRendering: false });
      return result;
    } catch (e) {
      this.main.updateStatus({ isRendering: false });
      throw e;
    }
  }

  // * Markdown

  svgm(ndir: string, kind: string, id: string, code: string): SvgMResult | Promise<SvgMResult> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.wasm!.svgm(path, code, kind, id);
  }

  async svgmAsync(ndir: string, kind: string, id: string, code: string): Promise<SvgMResult> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.svgm(path, code, kind, id)));
  }

  htmlm(ndir: string, kind: string, id: string, code: string): HtmlMResult | Promise<HtmlMResult> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.wasm!.htmlm(path, code, kind, id);
  }

  async htmlmAsync(ndir: string, kind: string, id: string, code: string): Promise<HtmlMResult> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.htmlm(path, code, kind, id)));
  }

  // * Preview

  svgp(vpath: VPath, code: string): SvgPResult | Promise<SvgPResult> {
    return this.wasm!.svgp(vpath, code);
  }

  async svgpAsync(vpath: VPath, code: string): Promise<SvgPResult> {
    return this.withStatus(vpath, () => this.compileWithRetry(() => this.wasm!.svgp(vpath, code)));
  }

  // * Export

  htmle(vpath: VPath, code: string, options: HtmlEOptions): HtmlEResult | Promise<HtmlEResult> {
    return this.wasm!.htmle(vpath, code, options);
  }

  async htmleAsync(vpath: VPath, code: string, options: HtmlEOptions): Promise<HtmlEResult> {
    return this.withStatus(vpath, () => this.compileWithRetry(() => this.wasm!.htmle(vpath, code, options)));
  }

  pdfe(vpath: VPath, code: string, options: PdfEOptions): PdfEResult | Promise<PdfEResult> {
    return this.wasm!.pdfe(vpath, code, options);
  }

  async pdfeAsync(vpath: VPath, code: string, options: PdfEOptions): Promise<PdfEResult> {
    return this.withStatus(vpath, () => this.compileWithRetry(() => this.wasm!.pdfe(vpath, code, options)));
  }

  svge(vpath: VPath, code: string, options: SvgEOptions): SvgEResult | Promise<SvgEResult> {
    return this.wasm!.svge(vpath, code, options);
  }

  async svgeAsync(vpath: VPath, code: string, options: SvgEOptions): Promise<SvgEResult> {
    return this.withStatus(vpath, () => this.compileWithRetry(() => this.wasm!.svge(vpath, code, options)));
  }

  pnge(vpath: VPath, code: string, options: PngEOptions): PngEResult | Promise<PngEResult> {
    return this.wasm!.pnge(vpath, code, options);
  }

  async pngeAsync(vpath: VPath, code: string, options: PngEOptions): Promise<PngEResult> {
    return this.withStatus(vpath, () => this.compileWithRetry(() => this.wasm!.pnge(vpath, code, options)));
  }
}

expose(WasmAdapter, self);

type Args = {
  fonts?: ArrayBuffer[];
  files?: Map<string, string>;
};

export interface Main {
  notice(message: string, duration?: number): void;
  updateStatus(status: { isRendering: boolean; message?: string }): void;
  readBinary(path: string): Uint8Array | Promise<ArrayBuffer>;
  writePackage(spec: PackageSpec, files: TarFile[]): Promise<void>;
  fetchPackage(spec: PackageSpec): Promise<ArrayBuffer>;
}

/** https://docs.rs/typst/latest/typst/diag/enum.FileError.html */
export enum ErrorCode {
  /** ファイル読み込みなど */
  Pending = 0,

  FileErrorNotFound = 10,
  FileErrorAccessDenied,
  FileErrorIsDirectory,
  FileErrorNotSource,
  FileErrorInvalidUtf8,
  FileErrorOther,

  PackageErrorNotFound = 20,
  PackageErrorVersionNotFound,
  PackageErrorNetworkFailed,
  PackageErrorMalformedArchive,
  PackageErrorOther,
}
