import type { SymbolSer } from '@/../pkg/typst_wasm';

export function formatSymbol(val: SymbolSer): string {
  return `**symbol:** \`${val.char}\``;
}
