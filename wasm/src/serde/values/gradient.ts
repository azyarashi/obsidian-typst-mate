import type { GradientSer } from '@/../pkg/typst_wasm';

export function formatGradient(val: GradientSer): string {
  return `**gradient:** \`${val.repr}\``;
}
