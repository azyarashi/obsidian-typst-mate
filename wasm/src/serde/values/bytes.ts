import type { BytesSer } from '@/../pkg/typst_wasm';

export function formatBytes(val: BytesSer): string {
  return `**bytes:** \`${val.length} bytes\``;
}
