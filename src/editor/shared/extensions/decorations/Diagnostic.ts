import { type Diagnostic, setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Processor } from '@/libs/processor';

import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';
import './Diagnostic.css';

interface TypstDiagnostic extends Diagnostic {
  hints: string[];
}

interface TypstMateResult {
  diags: TypstDiagnostic[];
  processor?: Processor;
  noDiag: boolean;
}

function computeDiagnostics(view: EditorView, result: TypstMateResult): Diagnostic[] {
  const helper = view.state.facet(editorHelperFacet);
  if (!helper) return [];

  const region = getActiveRegion(view);
  if (!region) return [];

  if (result.noDiag) return [];

  let offset: number;
  if (result.processor) {
    const { noPreamble, format } = result.processor;
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

  const docLength = view.state.doc.length;

  return result.diags
    .map((diag) => {
      const from = Math.max(region.from, Math.min(diag.from + offset, docLength));
      const to = Math.max(region.from, Math.min(diag.to + offset, docLength));

      return {
        from,
        to: Math.max(from, to),
        message: '',
        severity: diag.severity,
        renderMessage: () => {
          const container = document.createElement('div');
          container.classList.add('typstmate-diag');

          const messageEl = diag.severity === 'error' ? document.createElement('strong') : document.createElement('em');
          messageEl.textContent = diag.message;
          container.appendChild(messageEl);

          if (0 < diag.hints.length) {
            const hintsEl = document.createElement('div');
            hintsEl.classList.add('typstmate-diag-hints');
            diag.hints.forEach((hint, i) => {
              const hintLine = document.createElement('div');
              hintLine.textContent = `${i + 1}. ${hint}`;
              hintsEl.appendChild(hintLine);
            });
            container.appendChild(hintsEl);
          }
          return container;
        },
      } as Diagnostic;
    })
    .filter((d) => d.from <= d.to);
}

export const diagnosticsState = StateField.define<TypstMateResult | undefined>({
  create() {
    return undefined;
  },
  update(value, tr) {
    for (const e of tr.effects) if (e.is(diagnosticsStateEffect)) return e.value;

    return value;
  },
});

export const diagnosticsStateEffect = StateEffect.define<TypstMateResult | undefined>();

export const updateDiagnosticEffect = (view: EditorView, diags: TypstMateResult) => {
  view.dispatch({
    effects: diagnosticsStateEffect.of(diags),
  });

  const computed = computeDiagnostics(view, diags);
  view.dispatch(setDiagnostics(view.state, computed));
};

export const clearDiagnosticEffect = (view: EditorView) => {
  view.dispatch({
    effects: diagnosticsStateEffect.of(undefined),
  });
  view.dispatch(setDiagnostics(view.state, []));
};
