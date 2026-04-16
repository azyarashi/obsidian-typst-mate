import type { Dict } from '@/../pkg/typst_wasm';

export function formatDict(val: Dict): string {
  return `**dictionary:** \`(${Object.keys(val).length} keys)\``;
}
