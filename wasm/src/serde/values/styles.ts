import type { Styles } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatStyles(val: Styles): FormattedValue {
  return { top: wrapWithTypcInline(val.repr) };
}
