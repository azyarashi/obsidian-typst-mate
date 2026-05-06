import type { Label } from '@wasm';
import type { FormattedValue } from './types';

export function formatLabel(val: Label): FormattedValue {
  return { top: `**label:** \`<${val.name}>\`` };
}
