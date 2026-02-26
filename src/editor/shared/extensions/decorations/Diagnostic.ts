import { type Diagnostic, linter } from '@codemirror/lint';
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
  processor: Processor;
  noDiag: boolean;
}

export const diagnosticExtension = linter(
  (view) => {
    const helper = view.state.facet(editorHelperFacet);
    if (!helper) return [];

    const region = getActiveRegion(view);
    if (!region) return [];

    const result = view.state.field(diagnosticsState);
    if (!result) return [];
    if (result.noDiag) return [];

    const { noPreamble, format } = result.processor;
    const diagnostics = result.diags.map((diag) => {
      const offset =
        region.from +
        region.skip -
        format.indexOf('{CODE}') -
        (noPreamble ? 0 : helper.plugin.settings.preamble.length + 1) -
        helper.plugin.typstManager.preamble.length -
        1;

      return {
        from: Math.max(region.from, diag.from + offset),
        to: Math.max(region.from, diag.to + offset),
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
      };
    });

    return diagnostics;
  },
  {
    delay: 10,
  },
);

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
  return view.dispatch({
    effects: diagnosticsStateEffect.of(diags),
  });
};

export const clearDiagnosticEffect = (view: EditorView) => {
  return view.dispatch({
    effects: diagnosticsStateEffect.of(undefined),
  });
};
