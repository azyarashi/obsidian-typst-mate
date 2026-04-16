import type { Label } from '@/../pkg/typst_wasm';

export function formatLabel(val: Label): string {
  return `**label:** \`<${val.name}>\``;
}
