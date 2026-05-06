import type { Decimal } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatDecimal(val: Decimal): FormattedValue {
  return { top: wrapWithTypcInline(val.value) };
}
