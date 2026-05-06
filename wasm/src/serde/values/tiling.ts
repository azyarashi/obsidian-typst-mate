import type { Tiling } from '@wasm';
import type { FormattedValue } from './';
import { wrapWithTypcInline } from './utils';

export function formatTiling(val: Tiling): FormattedValue {
  return { top: wrapWithTypcInline(val.repr) };
}
