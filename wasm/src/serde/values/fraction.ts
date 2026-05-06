import type { Fr } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatFraction(fr: Fr): FormattedValue {
  const result = fr.numerator / fr.denominator;
  return { top: wrapWithTypcInline(`${fr.numerator}/${fr.denominator} (${result.toFixed(3)})`) };
}
