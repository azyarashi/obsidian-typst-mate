import type { Str } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatStr(v: Str): FormattedValue {
  return { top: wrapWithTypcInline(v.repr) };
}
