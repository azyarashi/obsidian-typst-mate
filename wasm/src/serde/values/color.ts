import type { Color } from '@/../pkg/typst_wasm';

export function formatColor(color: Color): string {
  const square = `
    <span style="background-color: ${color.hex}; width: 12px; height: 12px; display: inline-block; border: 1px solid var(--background-modifier-border); vertical-align: middle; border-radius: 2px; margin-right: 4px;"></span>
  `.trim();
  return `**color:** ${square} \`${color.hex}\``;
}
