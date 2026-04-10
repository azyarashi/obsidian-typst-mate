import type { TilingSer } from '@/../pkg/typst_wasm';

export function formatTiling(val: TilingSer): string {
  return `**tiling:** \`${val.repr}\``;
}
