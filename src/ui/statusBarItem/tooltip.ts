import type { MarkdownView } from 'obsidian';
import type { TypstMate } from '@/api';
import { diagnosticsState } from '@/editor/shared/extensions/Linter/extension';
import { t } from '@/i18n';

export function getStatusBarTooltip({
  rendering,
  activeView,
}: {
  rendering: typeof TypstMate.rendering;
  activeView: MarkdownView | null;
}) {
  const hasError = rendering.hasError;
  const isRendering = rendering.isRendering;

  let tooltip = 'Typst Mate';

  if (isRendering) {
    tooltip = rendering.message ?? '';
  } else if (hasError) {
    if (activeView) {
      const state = activeView.editor.cm.state.field(diagnosticsState, false);
      const firstError = state?.diagnostics?.find((d) => d.severity === 'error');
      tooltip = firstError?.message || t('common.error');
    } else {
      tooltip = t('common.error');
    }
  }

  return tooltip;
}
