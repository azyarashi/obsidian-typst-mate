import {
  Decoration,
  type DecorationSet,
  type EditorView,
  hoverTooltip,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import {
  diagnosticsState,
  getMappedDiagnostics,
  type TypstDiagnostic,
} from '@/editor/shared/extensions/Linter/extension';
import { renderDiagnosticMessage } from '@/ui/components/Diagnostic';

import './ErrorLens.css';

class ErrorLensWidget extends WidgetType {
  constructor(readonly diag: TypstDiagnostic) {
    super();
  }

  override eq(other: ErrorLensWidget) {
    return (
      this.diag.message === other.diag.message && this.diag.from === other.diag.from && this.diag.to === other.diag.to
    );
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-error-lens-widget cm-error-lens-widget-${this.diag.severity}`;
    span.textContent = this.diag.message;

    return span;
  }
}

function computeErrorLens(view: EditorView): DecorationSet {
  const result = view.state.field(diagnosticsState, false);
  if (!result || result.noDiag || !result.diagnostics || result.diagnostics.length === 0) {
    return Decoration.none;
  }

  const mapped = getMappedDiagnostics(view, result);
  const lineDiagnostics = new Map<number, TypstDiagnostic>();

  for (const diag of mapped) {
    try {
      const line = view.state.doc.lineAt(diag.from);

      if (line.text.trim() === '') continue;

      lineDiagnostics.set(line.number, diag);
    } catch {}
  }

  const decorations = [];
  for (const [lineNo, diag] of lineDiagnostics.entries()) {
    const line = view.state.doc.line(lineNo);
    decorations.push(
      Decoration.line({
        class: `cm-error-lens-line cm-error-lens-line-${diag.severity}`,
      }).range(line.from),
    );

    decorations.push(
      Decoration.widget({
        widget: new ErrorLensWidget(diag),
        side: 1,
      }).range(line.to),
    );
  }

  return Decoration.set(decorations, true);
}

const errorLensPlugin = ViewPlugin.fromClass(
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

const errorLensHover = hoverTooltip((view, pos) => {
  const line = view.state.doc.lineAt(pos);
  if (pos !== line.to) return null;

  const result = view.state.field(diagnosticsState, false);
  if (!result || result.noDiag || !result.diagnostics || result.diagnostics.length === 0) return null;

  const mapped = getMappedDiagnostics(view, result);

  for (const diag of mapped) {
    const diagLine = view.state.doc.lineAt(diag.from);

    if (diagLine.number === line.number) {
      if (diag.from <= pos && pos <= diag.to) return null;

      return {
        pos: line.to,
        create(v) {
          const dom = renderDiagnosticMessage({
            diagnostic: diag,
            state: { view: v, doc: v.state.doc.toString() },
          });
          return { dom };
        },
      };
    }
  }

  return null;
});

export const errorLensExtension = [errorLensPlugin, errorLensHover];
