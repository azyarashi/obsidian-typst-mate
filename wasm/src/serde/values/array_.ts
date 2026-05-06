import type { Array_ } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcBlock } from './utils';

export function formatArray(val: Array_): FormattedValue {
  return { top: wrapWithTypcBlock(val.repr) };
}
