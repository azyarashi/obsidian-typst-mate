import type { Styles } from '@/../pkg/typst_wasm';

export function formatStyles(val: Styles): string {
  return `**styles:** \`${val.repr}\``;
}
