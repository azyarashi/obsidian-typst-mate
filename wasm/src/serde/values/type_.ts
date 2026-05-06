import type { Type } from '@wasm';
import type { FormattedValue } from './';
import { wrapWithTypcInline } from './utils';

export function formatType(type_: Type): FormattedValue {
  return { top: wrapWithTypcInline(type_.repr), bottom: type_.docs };
}
