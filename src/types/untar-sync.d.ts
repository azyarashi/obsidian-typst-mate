declare module 'untar-sync' {
  export interface TarFile {
    name: string;
    buffer: ArrayBuffer;
    type: string;
    linkname?: string;
  }

  export default function untarSync(buffer: ArrayBuffer | Uint8Array): TarFile[];
}
