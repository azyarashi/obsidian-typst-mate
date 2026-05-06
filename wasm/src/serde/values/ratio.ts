import type { Ratio } from '@wasm';
import type { FormattedValue } from './types';

export function formatRatio(val: Ratio): FormattedValue {
  return { top: `**ratio:** \`${val.percentage}\`` };
}
