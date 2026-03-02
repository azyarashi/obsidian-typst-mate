import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { getActiveRegion } from '@/editor/shared/extensions/core/TypstMate';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';

import './ErrorLens.css';

function computeErrorLens(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  const result = view.state.field(diagnosticsState, false);
  if (!result || result.noDiag || !result.diagnostics || result.diagnostics.length === 0) return builder.finish();

  const region = getActiveRegion(view);
  if (!region) return builder.finish();

  const lineDiagnostics = new Map<
    number,
    { message: string; severity: 'error' | 'warning'; from: number; hints: string[] }
  >();
  const docLength = view.state.doc.length;

  for (const diag of result.diagnostics) {
    try {
      const from = Math.max(region.from, Math.min(diag.from, docLength));
      const line = view.state.doc.lineAt(from);
      if (line.text.trim() === '') continue;

      if (!lineDiagnostics.has(line.number)) {
        lineDiagnostics.set(line.number, {
          message: diag.message,
          severity: diag.severity,
          from: line.from,
          hints: diag.hints || [],
        });
      } else {
        const existing = lineDiagnostics.get(line.number);
        if (existing?.severity !== 'error' && diag.severity === 'error') {
          lineDiagnostics.set(line.number, {
            message: diag.message,
            severity: diag.severity,
            from: line.from,
            hints: diag.hints || [],
          });
        } else if (existing?.severity === diag.severity && diag.hints?.length) existing.hints.push(...diag.hints);
      }
    } catch {}
  }

  const sortedLines = Array.from(lineDiagnostics.keys()).sort((a, b) => a - b);

  for (const lineNo of sortedLines) {
    const diag = lineDiagnostics.get(lineNo)!;
    const line = view.state.doc.line(lineNo);
    let title = diag.message;
    if (diag.hints?.length) title += `\n\nHints:\n${diag.hints.join('\n')}`;

    builder.add(
      line.from,
      line.from,
      Decoration.line({
        class: `cm-error-lens-line cm-error-lens-line-${diag.severity}`,
        attributes: {
          'data-error-message': diag.message,
          title: title,
        },
      }),
    );
  }

  return builder.finish();
}

export const errorLensExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = computeErrorLens(view);
    }

    update(update: ViewUpdate) {
      const oldState = update.startState.field(diagnosticsState, false);
      const newState = update.state.field(diagnosticsState, false);
      const diagnosticsChanged = oldState !== newState;

      if (diagnosticsChanged) this.decorations = computeErrorLens(update.view);
      else if (update.docChanged) this.decorations = this.decorations.map(update.changes);
      else if (update.viewportChanged || update.selectionSet) this.decorations = computeErrorLens(update.view);
    }
  },
  {
    decorations: (v: any) => v.decorations,
  },
);
