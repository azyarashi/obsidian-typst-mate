import type { Version } from '@wasm';
import type { FormattedValue } from './';
import { wrapWithTypcInline } from './utils';

export function formatVersion(val: Version): FormattedValue {
  return { top: wrapWithTypcInline(val.repr) };
}
