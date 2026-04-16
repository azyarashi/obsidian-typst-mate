import type { Bytes } from '@/../pkg/typst_wasm';

export function formatBytes(val: Bytes): string {
  return `**bytes:** \`${val.length} bytes\``;
}
