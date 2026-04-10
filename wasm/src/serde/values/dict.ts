import type { DictSer } from '@/../pkg/typst_wasm';

export function formatDict(val: DictSer): string {
  return `**dictionary:** \`(${Object.keys(val).length} keys)\``;
}
