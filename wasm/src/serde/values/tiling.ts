import type { Tiling } from '@/../pkg/typst_wasm';

export function formatTiling(val: Tiling): string {
  return `**tiling:** \`${val.repr}\``;
}
