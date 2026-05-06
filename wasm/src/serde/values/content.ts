import type { Content } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatContent(val: Content): FormattedValue {
  return { top: wrapWithTypcInline(val.repr) };
}
