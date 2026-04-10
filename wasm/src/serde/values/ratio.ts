import type { RatioSer } from '@/../pkg/typst_wasm';

export function formatRatio(val: RatioSer): string {
  return `**ratio:** \`${val.percentage}\``;
}
