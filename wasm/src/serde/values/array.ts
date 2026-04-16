import type { Array } from '@/../pkg/typst_wasm';

export function formatArray(val: Array): string {
  return `**array:** \`(${val.elements.length} elements)\``;
}
