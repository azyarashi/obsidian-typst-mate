import type { Symbol_ } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatSymbol(val: Symbol_): FormattedValue {
  return { top: wrapWithTypcInline(val.char) };
}
