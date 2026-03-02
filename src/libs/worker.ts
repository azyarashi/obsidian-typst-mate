import type fsModule from 'node:fs';
import type pathModule from 'node:path';

import { expose } from 'comlink';
import type { EditorPosition } from 'obsidian';
import pako from 'pako';
import untar from 'untar-sync';

import init, { type InitOutput, Typst } from '../../pkg/typst_wasm.js';

let main: Main;

const map = new Map<string, Uint8Array | undefined>();
const xhr = new XMLHttpRequest();
xhr.overrideMimeType('text/plain; charset=x-user-defined');

export default class $ {
  module!: InitOutput;
  typst!: Typst;
  localPackagesDirPaths: string[];
  fs?: typeof fsModule;
  path?: typeof pathModule;
  baseDirPath: string;

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

  pdf(filename: string, code: string): PDFResult {
    return this.typst.pdf(filename, code);
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

  fetch(path: string) {
    if (map.has(path)) {
      const v = map.get(path);
      if (v) return v;
      throw 12; // FileError::NotFound
    }

    let isPackage = false;
    const readBinary = (vpath: string, rpath: string) => {
      const f = this.fs?.readFileSync ?? main.readBinary;

      const result = f(rpath);
      if (result instanceof Promise) {
        result
          .then((r) => {
            map.set(vpath, new Uint8Array(r));
          })
          .catch(() => {
            if (!map.has(vpath)) map.set(vpath, undefined);
          });
      } else {
        map.set(vpath, result);
        return new Uint8Array(result);
      }

      throw 0; // FileError::Other(implementation constraints)
    };

    if (path.startsWith('@')) {
      isPackage = true;
      path = path.slice(1);
      const [namespace, name, version] = path.split('/');
      const vpath = path.split('/').slice(3).join('/');
      const p = `${namespace}/${name}/${version}`;

      if (namespace === 'preview') {
        if (this.fs) {
          try {
            return readBinary(`@${path}`, `${this.localPackagesDirPaths[0]}/${p}/${vpath}`);
          } catch {}
        }

        if (vpath === 'typst.toml') main.notice(`Downloading ${name}...`, 500);

        xhr.open('GET', `https://packages.typst.org/preview/${name}-${version}.tar.gz`, false);
        xhr.send(null);
        if (xhr.status === 0) throw 21; // PackageError::NetworkFailed
        if (xhr.status === 404) throw 22; // PackageError::NotFound
        if (!xhr.responseText === null) throw 20; // PackageError::MalformedArchive

        try {
          const text = xhr.responseText;
          const targzArr = new Uint8Array(text.length);
          for (let i = 0; i < text.length; i++) {
            targzArr[i] = text.charCodeAt(i) & 0xff;
          }

          const tarArr = pako.ungzip(targzArr).buffer;
          const files = untar(tarArr) as {
            name: string;
            buffer: ArrayBuffer;
            type: string;
            linkname?: string;
          }[];
          main.writePackage(p, files);

          for (const f of files.filter((f) => f.type === '0')) {
            map.set(`@${p}/${f.name}`, new Uint8Array(f.buffer));
          }

          for (const f of files.filter((f) => f.type === '2')) {
            map.set(`@${p}/${f.name}`, new Uint8Array(map.get(f.linkname!)?.buffer || new ArrayBuffer(0)));
          }

          if (vpath === 'typst.toml') main.notice(`Downloaded successfully!`, 500);
        } catch (e) {
          console.error(e);
          throw 20; // PackageError::MalformedArchive;
        }

        return map.get(`@${p}/${vpath}`);
      }
    }

    if (isPackage) {
      for (const localPackagesDirPath of this.localPackagesDirPaths) {
        try {
          return readBinary(`@${path}`, `${localPackagesDirPath}/${path}`);
        } catch {}
      }
    } else {
      return readBinary(path, path);
    }

    throw 0; // FileError::Other(implementation constraints)
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

export interface PDFResult {
  pdf: Uint8Array;
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
