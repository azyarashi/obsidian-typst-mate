import type { Args } from '@/../pkg/typst_wasm';

export function formatArgs(val: Args): string {
  return `**arguments:** \`${val.repr}\``;
}
