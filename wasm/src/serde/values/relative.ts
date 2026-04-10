import type { RelativeSer } from '@/../pkg/typst_wasm';

export function formatRelative(val: RelativeSer): string {
  return `**relative:** \`${val.percentage}\``;
}
