import type { Dict } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatDict(val: Dict): FormattedValue {
  return { top: wrapWithTypcInline(`(${Object.keys(val.elements).length} keys)`) };
}
