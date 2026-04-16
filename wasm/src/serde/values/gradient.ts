import type { Gradient } from '@/../pkg/typst_wasm';

export function formatGradient(val: Gradient): string {
  return `**gradient:** \`${val.repr}\``;
}
