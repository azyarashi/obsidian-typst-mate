import type { ArgsSer } from '@/../pkg/typst_wasm';

export function formatArgs(val: ArgsSer): string {
  return `**arguments:** \`${val.repr}\``;
}
