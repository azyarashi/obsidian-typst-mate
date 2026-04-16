import type { Fr } from '@/../pkg/typst_wasm';

export function formatFraction(fr: Fr): string {
  const result = fr.numerator / fr.denominator;
  return `**fraction:** \`${fr.numerator}/${fr.denominator}\` (${result.toFixed(3)})`;
}
