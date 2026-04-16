import type { Length } from '@/../pkg/typst_wasm';

export function formatLength(val: Length): string {
  return `**length:** \`${val.abs}\` (${val.em})`;
}
