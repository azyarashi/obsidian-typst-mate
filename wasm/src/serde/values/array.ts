import type { ArraySer } from '@/../pkg/typst_wasm';

export function formatArray(val: ArraySer): string {
  return `**array:** \`(${val.elements.length} elements)\``;
}
