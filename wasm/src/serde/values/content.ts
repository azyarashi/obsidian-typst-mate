import type { ContentSer } from '@/../pkg/typst_wasm';

export function formatContent(val: ContentSer): string {
  return `**content:** \`${val.repr}\``;
}
