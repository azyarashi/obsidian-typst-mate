import type { TypstMate } from '@/api';

export function getStatusBarTooltip({ rendering }: { rendering: typeof TypstMate.rendering }) {
  const tooltip = rendering.isRendering || rendering.hasError ? (rendering.message ?? 'Typst Mate') : 'Typst Mate';

  return tooltip;
}
