import type { Color } from '@wasm';
import type { FormattedValue } from '.';
import { wrapWithTypcInline } from './utils';

export function formatColor(color: Color): FormattedValue {
  // TODO
  const square = `
    <span style="background-color: ${color.hex}; width: 12px; height: 12px; display: inline-block; border: 1px solid var(--background-modifier-border); vertical-align: middle; border-radius: 2px; margin-right: 4px;"></span>
  `.trim();
  return { top: wrapWithTypcInline(`${square}\`${color.hex}\``) };
}
