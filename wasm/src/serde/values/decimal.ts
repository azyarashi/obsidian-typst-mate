import type { Decimal } from '@/../pkg/typst_wasm';

export function formatDecimal(val: Decimal): string {
  return `**decimal:** \`${val.value}\``;
}
