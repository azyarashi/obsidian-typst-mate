import type { LengthSer } from '@/../pkg/typst_wasm';

export function formatLength(val: LengthSer): string {
  return `**length:** \`${val.abs}\` (${val.em})`;
}
