import type { LabelSer } from '@/../pkg/typst_wasm';

export function formatLabel(val: LabelSer): string {
  return `**label:** \`<${val.name}>\``;
}
