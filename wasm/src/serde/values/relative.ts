import type { Relative } from '@wasm';
import type { FormattedValue } from './types';

export function formatRelative(val: Relative): FormattedValue {
  return { top: `**relative:** \`${val.percentage}\`` };
}
