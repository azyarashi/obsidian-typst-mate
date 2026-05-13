import type { Length } from '@wasm';
import type { FormattedValue } from './';

export function formatLength(val: Length): FormattedValue {
  return { top: `**length:** \`${val.abs}\` (${val.em})` };
}
