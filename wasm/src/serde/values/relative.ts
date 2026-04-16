import type { Relative } from '@/../pkg/typst_wasm';

export function formatRelative(val: Relative): string {
  return `**relative:** \`${val.percentage}\``;
}
