import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { getActiveRegion } from '@/editor/shared/extensions/core/TypstMate';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';

import './ErrorLens.css';

class ErrorLensWidget extends WidgetType {
  constructor(readonly diag: { message: string; severity: 'error' | 'warning'; hints: string[] }) {
    super();
  }

  override eq(other: ErrorLensWidget) {
    return this.diag.message === other.diag.message && this.diag.severity === other.diag.severity;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-error-lens-widget cm-error-lens-widget-${this.diag.severity}`;
    span.textContent = this.diag.message;

    let title = this.diag.message;
    if (this.diag.hints?.length) title += `\n\nHints:\n${this.diag.hints.join('\n')}`;
    span.title = title;

    return span;
  }
}

function computeErrorLens(view: EditorView): DecorationSet {
  const result = view.state.field(diagnosticsState, false);
  if (!result || result.noDiag || !result.diagnostics || result.diagnostics.length === 0) {
    return Decoration.none;
  }

  const region = getActiveRegion(view);
  if (!region) return Decoration.none;

  const docLength = view.state.doc.length;
  const lineDiagnostics = new Map<
    number,
    { message: string; severity: 'error' | 'warning'; hints: string[]; from: number; to: number }
  >();

  for (const diag of result.diagnostics) {
    try {
      const from = Math.max(region.from, Math.min(diag.from, docLength));
      const line = view.state.doc.lineAt(from);

      if (line.text.trim() === '') continue;

      const existing = lineDiagnostics.get(line.number);
      if (!existing) {
        lineDiagnostics.set(line.number, {
          message: diag.message,
          severity: diag.severity,
          hints: diag.hints || [],
          from: line.from,
          to: line.to,
        });
      } else if (existing.severity !== 'error' && diag.severity === 'error') {
        lineDiagnostics.set(line.number, { ...existing, message: diag.message, severity: diag.severity });
      }
    } catch {}
  }

  const decorations = [];
  for (const diag of lineDiagnostics.values()) {
    decorations.push(
      Decoration.line({
        class: `cm-error-lens-line cm-error-lens-line-${diag.severity}`,
      }).range(diag.from),
    );

    decorations.push(
      Decoration.widget({
        widget: new ErrorLensWidget(diag),
        side: 1,
      }).range(diag.to),
    );
  }

  return Decoration.set(decorations, true);
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

      if (oldState !== newState) this.decorations = computeErrorLens(update.view);
      else if (update.docChanged) this.decorations = this.decorations.map(update.changes);
      else if (update.viewportChanged || update.selectionSet) this.decorations = computeErrorLens(update.view);
    }
  },
  {
    decorations: (v: any) => v.decorations,
  },
);
