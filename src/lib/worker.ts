import { expose } from 'comlink';
import pako from 'pako';
import untar from 'untar-sync';

import init, { type InitOutput, Typst } from '../../pkg/typst_wasm.js';

let main: Main;

const map = new Map<string, Uint8Array | undefined>();
const xhr = new XMLHttpRequest();
xhr.overrideMimeType('text/plain; charset=x-user-defined');

export default class $ {
  wasm: ArrayBuffer;
  module!: InitOutput;
  typst!: Typst;
  packagesDirPath: string;

  constructor(wasm: ArrayBuffer, packagesDirPath: string) {
    this.wasm = wasm;
    this.packagesDirPath = packagesDirPath;
  }

  async init(fontsize = 16): Promise<void> {
    if (this.typst) this.typst.free();
    this.module = await init({
      module_or_path: await WebAssembly.compile(this.wasm),
    });
    this.typst = new Typst(this.fetch.bind(this), fontsize);
  }

  store(args: Args): void {
    this.typst!.store(
      args.fonts ?? [],
      args.sources ?? [],
      args.processors ?? [],
    );
  }

  svg(code: string, kind: string, id: string): SVGResult {
    return this.typst!.svg(code, kind, id);
  }

  html(code: string, kind: string, id: string): SVGResult {
    return this.typst!.html(code, kind, id);
  }

  listFonts(): FontInfo[] {
    return this.typst!.list_fonts();
  }

  parseFont(font: ArrayBuffer): FontInfo[] {
    return this.typst!.get_font_info(font);
  }

  listPackages(): PackageSpec[] {
    return this.typst!.list_packages();
  }

  fetch(path: string) {
    if (map.has(path)) {
      const v = map.get(path);
      if (v) return v;
      throw 12; // FileError::NotFound
    }

    if (path.startsWith('@')) {
      path = path.slice(1);
      const [namespace, name, version, vpath] = path.split('/');
      const p = `${namespace}/${name}/${version}`;

      if (namespace === 'preview') {
        if (vpath === 'typst.toml') main.notice(`Downloading ${name}...`);

        try {
          xhr.open(
            'GET',
            `https://packages.typst.org/preview/${name}-${version}.tar.gz`,
            false,
          );
          xhr.send(null);
          if (xhr.status === 0) throw 21; // PackageError::NetworkFailed
          if (xhr.status === 404) throw 22; // PackageError::NotFound
          if (!xhr.responseText === null) throw 20; // PackageError::MalformedArchive

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
            map.set(
              `@${p}/${f.name}`,
              new Uint8Array(
                map.get(f.linkname!)?.buffer || new ArrayBuffer(0),
              ),
            );
          }

          if (vpath === 'typst.toml') main.notice(`Downloaded successfully!`);
        } catch (e) {
          console.error(e);
          throw 20; // PackageError::MalformedArchive;
        }

        return map.get(`@${p}/${vpath}`);
      } else {
        path = `${this.packagesDirPath}/${path}`;
      }
    }

    main
      .readBinary(path)
      .then((r) => {
        map.set(path, new Uint8Array(r));
      })
      .catch(() => {
        // TODO: IsDirectoryを判断する
        map.set(path, undefined);
      });

    throw 0; // FileError::Other(implementation constraints)
  }

  setMain(m: Main): void {
    main = m;
  }
}

expose($, self as any);

interface Processor {
  kind: string;
  id: string;
  format: string;
}

type Args = {
  fonts?: ArrayBuffer[];
  sources?: Map<string, Uint8Array>;
  processors?: Processor[];
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
  severity: number;
  span: {
    start: number;
    end: number;
  };
  message: string;
  trace: {
    span: {
      start: number;
      end: number;
    };
    point: string;
  }[];
  hints: string[];
}

export interface SVGResult {
  svg: string;
  diags: Diagnostic[];
}

export interface Main {
  notice(message: string): void;
  readBinary(path: string): Promise<ArrayBuffer>;
  writePackage(path: string, files: tarFile[]): void;
}
