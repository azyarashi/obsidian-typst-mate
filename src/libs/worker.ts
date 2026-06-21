import type fsModule from 'node:fs';
import type pathModule from 'node:path';

import { expose } from 'comlink';
import type { EditorPosition } from 'obsidian';

import init, { type InitOutput, Typst } from '../../pkg/typst_wasm.js';
import { fetchFile } from './fetchFile';

let main: Main;

const map = new Map<string, Uint8Array | undefined>();

export default class $ {
  module!: InitOutput;
  typst!: Typst;
  localPackagesDirPaths: string[];
  fs?: typeof fsModule;
  path?: typeof pathModule;
  baseDirPath: string;
  readonly pending = new Set<Promise<void>>();

  constructor(localPackagesDirPaths: string[], baseDirPath: string, isDesktopApp: boolean) {
    this.localPackagesDirPaths = localPackagesDirPaths;
    this.baseDirPath = baseDirPath;
    if (isDesktopApp) {
      // biome-ignore lint/security/noGlobalEval: to use require in worker
      // biome-ignore lint/complexity/noCommaOperator: to use require in worker with safely
      const req = (0, eval)('require');
      this.fs = req('node:fs');
      this.path = req('node:path');
    }
  }

  async init(wasm: ArrayBuffer, fontsize: number, offset: number): Promise<void> {
    if (this.typst) this.typst.free();
    this.module = await init({
      module_or_path: await WebAssembly.compile(wasm),
    });
    this.typst = new Typst(this.baseDirPath, this.fetch.bind(this), fontsize, offset);
  }

  setOffset(offset: number): void {
    this.typst.set_offset(offset);
  }

  store(args: Args): void {
    this.typst.store(args.fonts ?? [], args.sources ?? [], args.files ?? []);
  }

  svg(code: string, ndir: string, kind: string, id: string): SVGResult {
    return this.typst.svg(code, ndir, kind, id);
  }

  pdfr(ndir: string, filename: string, code: string, options: any): PdfrResult {
    return this.typst.pdfr(ndir, filename, code, options);
  }

  svgr(ndir: string, filename: string, code: string, options: any): SvgrResult {
    return this.typst.svgr(ndir, filename, code, options);
  }

  pngr(ndir: string, filename: string, code: string, options: any): PngrResult {
    return this.typst.pngr(ndir, filename, code, options);
  }

  svgp(ndir: string, filename: string, code: string): SVGPResult {
    return this.typst.svgp(ndir, filename, code);
  }

  listFonts(): FontInfo[] {
    return this.typst.list_fonts();
  }

  parseFont(font: ArrayBuffer): FontInfo[] {
    return this.typst.get_font_info(font);
  }

  listPackages(): PackageSpec[] {
    return this.typst.list_packages();
  }

  latex_to_typst(code: string): string {
    return this.typst.latex_to_typst(code);
  }

  typst_to_latex(code: string): string {
    return this.typst.typst_to_latex(code);
  }

  latexeq_to_typm(code: string): string {
    return this.typst.latexeq_to_typm(code);
  }

  typm_to_latexeq(code: string): string {
    return this.typst.typm_to_latexeq(code);
  }

  tikz_to_cetz(code: string): string {
    return this.typst.tikz_to_cetz(code);
  }

  cetz_to_tikz(code: string): string {
    return this.typst.cetz_to_tikz(code);
  }

  jumpFromClick(x: number, y: number): Jump | null {
    return this.typst.jump_from_click(x, y);
  }

  jumpFromClickP(page: number, x: number, y: number): Jump | null {
    return this.typst.jump_from_click_p(page, x, y);
  }

  jumpFromCursorP(cursor: number): Jump[] {
    return this.typst.jump_from_cursor_p(cursor);
  }

  fetch(path: string): Uint8Array {
    return fetchFile(path, {
      map,
      fs: this.fs,
      main,
      localPackagesDirPaths: this.localPackagesDirPaths,
      baseDirPath: this.baseDirPath,
      pending: this.pending,
    });
  }

  /** Resolves once all in-flight async file reads (from mobile / Comlink paths) have settled. */
  async awaitPending(): Promise<void> {
    if (this.pending.size === 0) return;
    await Promise.all([...this.pending]);
  }

  setMain(m: Main): void {
    main = m;
  }
}

expose($, self as any);

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

export interface SVGResult {
  svg: string;
  diags: Diagnostic[];
}

export interface PdfrResult {
  pdf: Uint8Array;
  diags: Diagnostic[];
}

export interface SvgrResult {
  svgs: string[];
  diags: Diagnostic[];
}

export interface PngrResult {
  images: Uint8Array[];
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
  open_pos: EditorPosition;
  close_offset: number;
  close_pos: EditorPosition;
}

export interface BracketHighlights {
  id: number;
  pairs: BracketPair[];
  highlights: {
    paren: EditorPosition[];
    bracket: EditorPosition[];
    brace: EditorPosition[];
  };
}

export interface Main {
  notice(message: string, duration?: number): void;
  readBinary(path: string): Uint8Array | Promise<ArrayBuffer>;
  writePackage(path: string, files: tarFile[]): void;
}

export type Jump =
  | {
      type: 'file';
      package?: string;
      path: string;
      pos?: number;
    }
  | {
      type: 'url';
      url: string;
    }
  | {
      type: 'position';
      page: number;
      x: number;
      y: number;
    };
