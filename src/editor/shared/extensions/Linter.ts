import { type Diagnostic, setDiagnostics } from '@codemirror/lint';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { TypstMate } from '@/api';

import { renderDiagnosticMessage } from '@/ui/elements/diagnostics';
import { getActiveRegion } from '../utils/core';
import { diagnosticsState, type TypstMateResult } from './Diagnostic';

function computeDiagnostics(view: EditorView, result: TypstMateResult): Diagnostic[] {
  if (result.noDiag) return [];

  const region = getActiveRegion(view);
  if (!region) return [];

  const offset = region.from + region.skip + result.offset;

  const docLength = view.state.doc.length;

  const mapped = result.diagnostics.map((diag) => {
    const from = Math.max(region.from, Math.min(diag.from + offset, docLength));
    const to = Math.max(region.from, Math.min(diag.to + offset, docLength));

    return {
      from,
      to,
      message: diag.message,
      severity: diag.severity,
      renderMessage: () =>
        renderDiagnosticMessage({
          severity: diag.severity,
          message: diag.message,
          hints: diag.hints,
        }),
    } as Diagnostic;
  });

  const uniqueDiags: Diagnostic[] = [];
  const seenStr = new Set<string>();
  const zeroWidthPos = new Set<number>();

  for (const item of mapped) {
    const key = `${item.from}-${item.to}-${item.message}`;
    if (!seenStr.has(key)) {
      seenStr.add(key);

      if (item.from === item.to) {
        if (zeroWidthPos.has(item.from)) continue;
        zeroWidthPos.add(item.from);
      }

      uniqueDiags.push(item);
    }
  }

  return uniqueDiags;
}

export const linterExtension = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      this.updateDiagnostics();
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.startState.field(diagnosticsState) !== update.state.field(diagnosticsState)) {
        this.updateDiagnostics();
      }
    }

    updateDiagnostics() {
      const result = this.view.state.field(diagnosticsState);
      if (!result) {
        requestAnimationFrame(() => {
          this.view.dispatch(setDiagnostics(this.view.state, []));
        });

        return;
      }

      const computed = computeDiagnostics(this.view, result);

      const hasError = computed.some((d) => d.severity === 'error');
      if (TypstMate.rendering.hasError !== hasError) TypstMate.update(undefined, { ...TypstMate.rendering, hasError });

      requestAnimationFrame(() => {
        this.view.dispatch(setDiagnostics(this.view.state, computed));
      });
    }
  },
);
