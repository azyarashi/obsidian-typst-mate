import type { Dyn } from '@/../pkg/typst_wasm';

export function formatDyn(v: Dyn): string {
  return `**object:** \`${v.repr}\``;
}
