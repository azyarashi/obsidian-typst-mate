import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { getActiveRegion } from '@/editor/shared/extensions/core/TypstMate';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';

import './ErrorLens.css';

function computeErrorLens(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  const diagResult = view.state.field(diagnosticsState, false);
  if (!diagResult || diagResult.noDiag || !diagResult.diags || diagResult.diags.length === 0) {
    return builder.finish();
  }

  const region = getActiveRegion(view);
  if (!region) return builder.finish();

  const helper = view.state.facet(editorHelperFacet);
  let offset: number;
  if (diagResult.processor) {
    const { noPreamble, format } = diagResult.processor;
    offset =
      region.from +
      region.skip -
      format.indexOf('{CODE}') -
      (noPreamble ? 0 : helper.plugin.settings.preamble.length + 1) -
      helper.plugin.typstManager.preamble.length -
      1;
  } else {
    offset = 0;
  }

  const lineDiagnostics = new Map<
    number,
    { message: string; severity: 'error' | 'warning' | 'info' | 'hint'; from: number; hints: string[] }
  >();
  const docLength = view.state.doc.length;

  for (const diag of diagResult.diags) {
    try {
      const from = Math.max(region.from, Math.min(diag.from + offset, docLength));
      const line = view.state.doc.lineAt(from);

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
        } else if (existing?.severity === diag.severity && diag.hints?.length) {
          existing.hints.push(...diag.hints);
        }
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
      let run = update.docChanged || update.viewportChanged;
      if (!run) {
        const oldState = update.startState.field(diagnosticsState, false);
        const newState = update.state.field(diagnosticsState, false);
        if (oldState !== newState) {
          run = true;
        }
      } else this.decorations = computeErrorLens(update.view);
    }
  },
  {
    decorations: (v: any) => v.decorations,
  },
);
