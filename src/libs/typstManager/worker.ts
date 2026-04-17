import type fsModule from 'node:fs';
import type pathModule from 'node:path';
import { expose } from 'comlink';
import type { TarFile } from 'untar-sync';
import untar from 'untar-sync';
import init, {
  type CompletionResult,
  type Definition,
  type Diagnostic,
  type FontInfo,
  type FormatOptions,
  type FormatResult,
  type HtmlEOptions,
  type HtmlEResult,
  type HtmlMResult,
  type Jump,
  type PackageSpec,
  type PdfEOptions,
  type PdfEResult,
  type PngEOptions,
  type PngEResult,
  type SvgEOptions,
  type SvgEResult,
  type SvgMResult,
  type SvgPResult,
  type Tooltip,
  Wasm,
} from '@/../pkg/typst_wasm.js';
import type { Features } from '../features';

export type {
  CompletionResult,
  Definition,
  Diagnostic,
  FontInfo,
  FormatOptions,
  FormatResult,
  HtmlEOptions,
  HtmlEResult,
  HtmlMResult,
  Jump,
  PackageSpec,
  PdfEOptions,
  PdfEResult,
  PngEOptions,
  PngEResult,
  SvgEOptions,
  SvgEResult,
  SvgMResult,
  SvgPResult,
  Tooltip,
};

export interface BaseResult {
  diags: Diagnostic[];
}

/**
 * Path: 絶対パス
 */
type Path = string;
type FileMap = Map<Path, Uint8Array | undefined>;

const fileMap: FileMap = new Map();
const packagesMap: Map<Path, FileMap> = new Map();
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

  svgp(ndir: string, filename: string, code: string): SvgPResult | Promise<SvgPResult> {
    const path = this.getFullPath(ndir, filename);
    return this.wasm!.svgp(path, code);
  }

  async svgpAsync(ndir: string, filename: string, code: string): Promise<SvgPResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.svgp(path, code)));
  }

  // * Export

  htmle(ndir: string, filename: string, code: string, options: HtmlEOptions): HtmlEResult | Promise<HtmlEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.wasm!.htmle(path, code, options);
  }

  async htmleAsync(ndir: string, filename: string, code: string, options: HtmlEOptions): Promise<HtmlEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.htmle(path, code, options)));
  }

  pdfe(ndir: string, filename: string, code: string, options: PdfEOptions): PdfEResult | Promise<PdfEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.wasm!.pdfe(path, code, options);
  }

  async pdfeAsync(ndir: string, filename: string, code: string, options: PdfEOptions): Promise<PdfEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.pdfe(path, code, options)));
  }

  svge(ndir: string, filename: string, code: string, options: SvgEOptions): SvgEResult | Promise<SvgEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.wasm!.svge(path, code, options);
  }

  async svgeAsync(ndir: string, filename: string, code: string, options: SvgEOptions): Promise<SvgEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.svge(path, code, options)));
  }

  pnge(ndir: string, filename: string, code: string, options: PngEOptions): PngEResult | Promise<PngEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.wasm!.pnge(path, code, options);
  }

  async pngeAsync(ndir: string, filename: string, code: string, options: PngEOptions): Promise<PngEResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.pnge(path, code, options)));
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

export enum ErrorCode {
  Pending = 0,

  /** https://docs.rs/typst/latest/typst/diag/enum.FileError.html#variant.NotFound */
  FileErrorNotFound = 10,
  /** https://docs.rs/typst/latest/typst/diag/enum.FileError.html#variant.AccessDenied */
  FileErrorAccessDenied,
  /** https://docs.rs/typst/latest/typst/diag/enum.FileError.html#variant.IsDirectory */
  FileErrorIsDirectory,
  /** https://docs.rs/typst/latest/typst/diag/enum.FileError.html#variant.NotSource */
  FileErrorNotSource,
  /** https://docs.rs/typst/latest/typst/diag/enum.FileError.html#variant.InvalidUtf8 */
  FileErrorInvalidUtf8,
  /** https://docs.rs/typst/latest/typst/diag/enum.FileError.html#variant.Other */
  FileErrorOther,

  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.NotFound */
  PackageErrorNotFound = 20,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.VersionNotFound */
  PackageErrorVersionNotFound,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.NetworkFailed */
  PackageErrorNetworkFailed,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.MalformedArchive */
  PackageErrorMalformedArchive,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.Other */
  PackageErrorOther,
}
