import type { Bytes } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatBytes(val: Bytes): FormattedValue {
  return { top: wrapWithTypcInline(`${val.length} bytes`) };
}
