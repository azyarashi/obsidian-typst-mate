import type { FrSer } from '@/../pkg/typst_wasm';

export function formatFraction(fr: FrSer): string {
  const result = fr.numerator / fr.denominator;
  return `**fraction:** \`${fr.numerator}/${fr.denominator}\` (${result.toFixed(3)})`;
}
