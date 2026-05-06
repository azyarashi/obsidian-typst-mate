import type { Angle } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatAngle(angle: Angle): FormattedValue {
  return { top: wrapWithTypcInline(`${angle.deg} (${angle.rad})`) };
}
