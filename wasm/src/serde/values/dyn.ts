import type { DynSer } from '@/../pkg/typst_wasm';

export function formatDyn(v: DynSer): string {
  return `**object:** \`${v.repr}\``;
}
