function getExtension(path: string) {
  return path.split('.').pop()?.toLowerCase();
}

export function filterWithExtensions(paths: readonly string[], extensions: readonly string[]) {
  return paths.filter((p) => extensions.includes(getExtension(p) ?? ''));
}

export function arrayBufferLikeToArrayBuffer(arrayBufferLike: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  const uint8Array = new Uint8Array(arrayBufferLike);
  const buffer = new ArrayBuffer(uint8Array.byteLength);
  new Uint8Array(buffer).set(uint8Array);
  return buffer;
}
