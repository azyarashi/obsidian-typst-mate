import type { StylesSer } from '@/../pkg/typst_wasm';

export function formatStyles(val: StylesSer): string {
  return `**styles:** \`${val.repr}\``;
}
