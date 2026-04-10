import type { VersionSer } from '@/../pkg/typst_wasm';

export function formatVersion(val: VersionSer): string {
  return `**version:** \`${val.version}\``;
}
