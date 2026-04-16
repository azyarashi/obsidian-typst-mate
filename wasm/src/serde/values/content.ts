import type { Content } from '@/../pkg/typst_wasm';

export function formatContent(val: Content): string {
  return `**content:** \`${val.repr}\``;
}
