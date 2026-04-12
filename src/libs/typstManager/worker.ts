import type fsModule from 'node:fs';
import type pathModule from 'node:path';
import { expose } from 'comlink';
import type * as Obsidian from 'obsidian';
import type { TarFile } from 'untar-sync';
import untar from 'untar-sync';
import init, {
  type CompletionResultSer,
  type DefinitionSer,
  type FontInfoSer,
  type FormatOptionsSer,
  type FormatResultSer,
  type HtmlOptionsSer,
  type HtmlResultSer,
  type JumpSer,
  type PackageSpecSer,
  type PdfOptionsSer,
  type PdfrResultSer,
  type PngOptionsSer,
  type PngrResultSer,
  type SvgOptionsSer,
  type SvgpResultSer,
  type SvgResultSer,
  type SvgrResultSer,
  type TooltipSer,
  Wasm,
} from '@/../pkg/typst_wasm.js';

export type {
  CompletionResultSer,
  DefinitionSer,
  FontInfoSer,
  FormatOptionsSer,
  FormatResultSer,
  HtmlOptionsSer,
  HtmlResultSer,
  JumpSer,
  PackageSpecSer,
  PdfOptionsSer,
  PdfrResultSer,
  PngOptionsSer,
  PngrResultSer,
  SvgOptionsSer,
  SvgpResultSer,
  SvgResultSer,
  SvgrResultSer,
  TooltipSer,
};

/**
 * Path: 絶対パス
 */
type Path = string;
type FileMap = Map<Path, Uint8Array | undefined>;
const fileMap: FileMap = new Map();
const packagesMap: Map<Path, FileMap> = new Map();
const obsidianResultsCache: Map<string, unknown> = new Map();
const pendingPromises: Promise<unknown>[] = [];

export default class WasmAdapter {
  private wasm?: Wasm;
  private main!: Main;

  baseDirPath: string;
  localPackagesDirPaths: string[];
  private inFlightDownloads: Set<string> = new Set();

  private fs?: typeof fsModule;
  private path?: typeof pathModule;

  constructor(localPackagesDirPaths: string[], baseDirPath: string, isNodeEnabled: boolean) {
    this.localPackagesDirPaths = localPackagesDirPaths;
    this.baseDirPath = baseDirPath;
    if (isNodeEnabled) {
      // biome-ignore lint/security/noGlobalEval: to use require in worker
      // biome-ignore lint/complexity/noCommaOperator: to use require in worker with safely
      const req = (0, eval)('require');
      this.fs = req('node:fs');
      this.path = req('node:path');
    }
  }

  /**
   * obsidian が持つ関数を呼び出し, 結果を返す。非同期の場合は pending とし, 再コンパイル時に結果を返す。
   * @param name - 関数名 ("parseLinktext" や "app.vault.read" など)
   * @param args - 引数 (null の場合は生プログパティ取得)
   */
  callObsidian(name: string, args: unknown[] | null): unknown {
    const key = JSON.stringify({ name, args });
    if (obsidianResultsCache.has(key)) {
      const res = obsidianResultsCache.get(key);
      if (res instanceof Promise) throw ErrorCode.Pending;
      if (res && typeof res === 'object' && '__error' in res) return undefined;
      return res;
    }

    // メインスレッドのヘルパーを呼び出す（常に Promise となる）
    const result = this.main.callObsidian(name, args);

    if (result instanceof Promise) {
      obsidianResultsCache.set(key, result);
      pendingPromises.push(
        result
          .then((res) => {
            obsidianResultsCache.set(key, res);
          })
          .catch((err) => {
            console.error('[typst-mate] callObsidian error:', err);
            obsidianResultsCache.set(key, { __error: String(err) });
          }),
      );
      throw ErrorCode.Pending;
    }

    obsidianResultsCache.set(key, result);
    return result;
  }

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
      this.callObsidian.bind(this),
    );
  }

  async free() {
    this.wasm?.free();
  }

  setOffset(offset: number): void {
    this.wasm!.set_offset(offset);
  }

  store(args: Args): void {
    const files: Map<string, string> = new Map();
    if (args.files) for (const [p, t] of args.files) files.set(`${this.baseDirPath}${p}`, t);
    this.wasm!.store(args.fonts ?? [], args.sources ?? [], files);
  }

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
    }
  }

  private getFullPath(ndir: string, filename: string): string {
    if (this.path) return this.path.join(this.baseDirPath, ndir, filename);

    return `${this.baseDirPath}${ndir}${filename}`;
  }

  svg(code: string, ndir: string, kind: string, id: string): SvgResultSer | Promise<SvgResultSer> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.withStatus(path, () => this.wasm!.svg(code, path, kind, id));
  }

  async svgAsync(code: string, ndir: string, kind: string, id: string): Promise<SvgResultSer> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.svg(code, path, kind, id)));
  }

  html(code: string, ndir: string, kind: string, id: string): HtmlResultSer | Promise<HtmlResultSer> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.withStatus(path, () => this.wasm!.html(code, path, kind, id));
  }

  async htmlAsync(code: string, ndir: string, kind: string, id: string): Promise<HtmlResultSer> {
    const path = this.getFullPath(ndir, `${kind}_${id}.typ`);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.html(code, path, kind, id)));
  }

  htmlr(ndir: string, filename: string, code: string, options: HtmlOptionsSer): HtmlResultSer | Promise<HtmlResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.wasm!.htmlr(path, code, options));
  }

  async htmlrAsync(ndir: string, filename: string, code: string, options: HtmlOptionsSer): Promise<HtmlResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.htmlr(path, code, options)));
  }

  pdfr(ndir: string, filename: string, code: string, options: PdfOptionsSer): PdfrResultSer | Promise<PdfrResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.wasm!.pdfr(path, code, options));
  }

  async pdfrAsync(ndir: string, filename: string, code: string, options: PdfOptionsSer): Promise<PdfrResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.pdfr(path, code, options)));
  }

  svgr(ndir: string, filename: string, code: string, options: SvgOptionsSer): SvgrResultSer | Promise<SvgrResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.wasm!.svgr(path, code, options));
  }

  async svgrAsync(ndir: string, filename: string, code: string, options: SvgOptionsSer): Promise<SvgrResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.svgr(path, code, options)));
  }

  pngr(ndir: string, filename: string, code: string, options: PngOptionsSer): PngrResultSer | Promise<PngrResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.wasm!.pngr(path, code, options));
  }

  async pngrAsync(ndir: string, filename: string, code: string, options: PngOptionsSer): Promise<PngrResultSer> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.pngr(path, code, options)));
  }

  svgp(ndir: string, filename: string, code: string): SVGPResult | Promise<SVGPResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.wasm!.svgp(path, code));
  }

  async svgpAsync(ndir: string, filename: string, code: string): Promise<SVGPResult> {
    const path = this.getFullPath(ndir, filename);
    return this.withStatus(path, () => this.compileWithRetry(() => this.wasm!.svgp(path, code)));
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

  format(code: string, options: FormatOptionsSer): FormatResultSer {
    return this.wasm!.format(code, options);
  }

  async formatAsync(code: string, options: FormatOptionsSer): Promise<FormatResultSer> {
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
    return this.wasm!.jump_from_click(x, y);
  }

  async jumpFromClickAsync(x: number, y: number) {
    return this.compileWithRetry(() => this.wasm!.jump_from_click(x, y));
  }

  jumpFromClickP(page: number, x: number, y: number) {
    return this.wasm!.jump_from_click_p(page, x, y);
  }

  async jumpFromClickPAsync(page: number, x: number, y: number) {
    return this.compileWithRetry(() => this.wasm!.jump_from_click_p(page, x, y));
  }

  jumpFromCursorP(cursor: number) {
    return this.wasm!.jump_from_cursor_p(cursor);
  }

  async jumpFromCursorPAsync(cursor: number) {
    return this.compileWithRetry(() => this.wasm!.jump_from_cursor_p(cursor));
  }

  readFile(path: string): Uint8Array {
    if (fileMap.has(path)) {
      const v = fileMap.get(path);
      if (v) return v;
      throw ErrorCode.FileErrorNotFound;
    }

    const result = (this.fs?.readFileSync ?? this.main.readBinary)(path);

    if (result instanceof Promise) {
      pendingPromises.push(
        result
          .then((r) => {
            fileMap.set(path, new Uint8Array(r));
          })
          .catch(() => {
            fileMap.set(path, undefined);
          }),
      );
      throw ErrorCode.Pending;
    }

    const v = new Uint8Array(result);
    fileMap.set(path, v);

    return v;
  }

  /**
   * wasm 側から呼ばれるパッケージファイル参照コールバック。
   * ローカルディレクトリおよび map キャッシュのみを確認する。
   * 見つからなければ ErrorCode.FileErrorNotFound を投げる → wasm 側が downloadPackage を起動する。
   * @param pkgKey - `"namespace/name/version"` 形式
   * @param vpath  - `"lib.typ"` などパッケージ内のパス
   */
  readPackageFile(pkgKey: string, vpath: string): Uint8Array {
    // キャッシュ確認
    let packageMap = packagesMap.get(pkgKey);
    if (!packageMap) {
      packageMap = new Map();
      packagesMap.set(pkgKey, packageMap);
    }

    if (this.inFlightDownloads.has(pkgKey)) {
      throw ErrorCode.Pending;
    }

    if (packageMap.has(vpath)) {
      const v = packageMap.get(vpath);
      if (v) return v;
      throw ErrorCode.FileErrorNotFound;
    }

    // ローカルパッケージディレクトリを確認
    for (const dir of this.localPackagesDirPaths) {
      const fullPath = `${dir}/${pkgKey}/${vpath}`;
      const result = (this.fs?.readFileSync ?? this.main.readBinary)(fullPath);

      if (result instanceof Promise) {
        pendingPromises.push(
          result
            .then((r) => {
              let pm = packagesMap.get(pkgKey);
              if (!pm) {
                pm = new Map();
                packagesMap.set(pkgKey, pm);
              }
              pm.set(vpath, new Uint8Array(r));
            })
            .catch(() => {
              let pm = packagesMap.get(pkgKey);
              if (!pm) {
                pm = new Map();
                packagesMap.set(pkgKey, pm);
              }
              pm.set(vpath, undefined);
            }),
        );
        throw ErrorCode.Pending;
      }

      if (result) {
        const u8 = result instanceof Uint8Array ? result : new Uint8Array(result);
        packageMap.set(vpath, u8);
        return u8;
      }
    }

    throw ErrorCode.FileErrorNotFound;
  }

  downloadPackage(pkgKey: string): void {
    if (this.inFlightDownloads.has(pkgKey)) return;
    this.inFlightDownloads.add(pkgKey);

    const [, name] = pkgKey.split('/');
    this.main.notice(`Downloading ${name}...`, 500);

    pendingPromises.push(
      this.main
        .fetchPackage(pkgKey)
        .then(async (tarGzBuffer) => {
          const ds = new DecompressionStream('gzip');
          const decompressedStream = new Response(tarGzBuffer).body!.pipeThrough(ds);
          const tarArr = await new Response(decompressedStream).arrayBuffer();

          const files = untar(tarArr);

          await this.main.writePackage(pkgKey, files);

          let packageMap = packagesMap.get(pkgKey);
          if (!packageMap) {
            packageMap = new Map();
            packagesMap.set(pkgKey, packageMap);
          }

          // 通常ファイルを格納
          for (const f of files.filter((f) => f.type === '0')) {
            packageMap.set(f.name, new Uint8Array(f.buffer));
          }
          // シンボリックリンクを展開
          for (const f of files.filter((f) => f.type === '2')) {
            packageMap.set(f.name, new Uint8Array(packageMap.get(f.linkname!)?.buffer ?? new ArrayBuffer(0)));
          }

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
    const wasm = this.wasm;
    if (!wasm) return compile();

    for (let i = 0; i < 100000; i++) {
      try {
        const result = compile();
        if (!wasm.take_pending()) {
          return result;
        }
      } catch (e) {
        if (e === ErrorCode.Pending || wasm.take_pending()) {
          // 待機が必要
        } else {
          throw e;
        }
      }

      const toWait = pendingPromises.splice(0);
      if (toWait.length > 0) {
        await Promise.all(toWait);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return compile();
  }

  private withStatus<T>(path: string, fn: () => T): T {
    this.main.updateStatus({ isRendering: true, path });
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then((r) => {
            this.main.updateStatus({ isRendering: false });
            return r;
          })
          .catch((e) => {
            this.main.updateStatus({ isRendering: false });
            throw e;
          }) as T;
      }
      this.main.updateStatus({ isRendering: false });
      return result;
    } catch (e) {
      this.main.updateStatus({ isRendering: false });
      throw e;
    }
  }
}

expose(WasmAdapter, self);

type Args = {
  fonts?: ArrayBuffer[];
  sources?: Map<string, Uint8Array>;
  files?: Map<string, string>;
};

export interface FontVariant {
  style: string;
  weight: number;
  stretch: number;
}

export interface FontInfo {
  family: string;
  variant: FontVariant;
  flags: number;
  coverage: number[];
}

export interface PackageSpec {
  namespace: string;
  name: string;
  version: string;
}

export interface Diagnostic {
  severity: 'error' | 'warning';
  from: number;
  to: number;
  message: string;
  hints: string[];
}

export interface BaseResult {
  diags: Diagnostic[];
}

export interface SVGPResult {
  svgp: string[];
  diags: Diagnostic[];
}

export interface BracketPair {
  kind: 'paren' | 'bracket' | 'brace';
  depth: number;
  open_offset: number;
  open_pos: Obsidian.EditorPosition;
  close_offset: number;
  close_pos: Obsidian.EditorPosition;
}

export interface BracketHighlights {
  id: number;
  pairs: BracketPair[];
  highlights: {
    paren: Obsidian.EditorPosition[];
    bracket: Obsidian.EditorPosition[];
    brace: Obsidian.EditorPosition[];
  };
}

export interface Main {
  notice(message: string, duration?: number): void;
  readBinary(path: string): Uint8Array | Promise<ArrayBuffer>;
  writePackage(path: string, files: TarFile[]): Promise<void>;
  fetchPackage(pkgKey: string): Promise<ArrayBuffer>;
  updateStatus(status: { isRendering: boolean; path?: string }): void;
  callObsidian(name: string, args: unknown[] | null): unknown;
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
  PackageErrorNotFound,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.VersionNotFound */
  PackageErrorVersionNotFound,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.NetworkFailed */
  PackageErrorNetworkFailed,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.MalformedArchive */
  PackageErrorMalformedArchive,
  /** https://docs.rs/typst/latest/typst/diag/enum.PackageError.html#variant.Other */
  PackageErrorOther,
}
