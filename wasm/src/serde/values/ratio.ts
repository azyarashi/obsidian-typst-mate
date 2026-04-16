import type { Ratio } from '@/../pkg/typst_wasm';

export function formatRatio(val: Ratio): string {
  return `**ratio:** \`${val.percentage}\``;
}
