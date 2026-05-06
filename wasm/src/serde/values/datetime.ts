import type { Datetime } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatDatetime(dt: Datetime): FormattedValue {
  const date = `${dt.year}-${dt.month}-${dt.day}`;
  const time = `${dt.hour}:${dt.minute}:${dt.second}`;
  return { top: wrapWithTypcInline(`${date} ${time}`) };
}
