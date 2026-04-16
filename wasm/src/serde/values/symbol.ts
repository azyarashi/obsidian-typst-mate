import type { Symbol } from '@/../pkg/typst_wasm';

export function formatSymbol(val: Symbol): string {
  return `**symbol:** \`${val.char}\``;
}
