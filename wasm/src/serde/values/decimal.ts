import type { DecimalSer } from '@/../pkg/typst_wasm';

export function formatDecimal(val: DecimalSer): string {
  return `**decimal:** \`${val.value}\``;
}
