import type { Gradient } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatGradient(val: Gradient): FormattedValue {
  return { top: wrapWithTypcInline(val.repr) };
}
