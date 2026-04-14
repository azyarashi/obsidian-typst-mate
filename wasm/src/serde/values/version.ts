import type { Version } from '@/../pkg/typst_wasm';

export function formatVersion(val: Version): string {
  return `**version:** \`${val.version}\``;
}
