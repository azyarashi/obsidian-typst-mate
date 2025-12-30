import { type Diagnostic, linter } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Processor, ProcessorKind } from '@/libs/processor';
import type { EditorHelper } from '../../editor';

import './diagnostic.css';

interface TypstDiagnostic extends Diagnostic {
  hints: string[];
}

interface TypstMateResult {
  diags: TypstDiagnostic[];
  kind: ProcessorKind;
  processor: Processor;
  offset: number;
  noDiag: boolean;
}

export const createDiagnosticExtension = (helper: EditorHelper) => {
  return linter((view) => {
    if (!helper.mathObject) return [];
    // TODO: コードブロックには効かない
    if (helper.mathObject.kind === 'codeblock') return [];

    // @ts-expect-error
    const result = view.state.field(diagnosticsState);
    if (!result) return [];
    if (result.noDiag) return [];

    const { noPreamble, format } = result.processor;
    const diagnostics = result?.diags
      .map((diag) => {
        const offset =
          helper.mathObject!.startOffset +
          result.offset -
          (noPreamble ? 0 : helper.plugin.settings.preamble.length + 1) -
          format.indexOf('{CODE}');
        return {
          from: diag.from + offset,
          to: diag.to + offset,
          message: '',
          severity: diag.severity,
          renderMessage: () => {
            if (result.kind === 'inline') helper.hideAllPopup();
            const container = document.createElement('div');
            container.classList.add('typst-mate-diag');

            const messageEl =
              diag.severity === 'error' ? document.createElement('strong') : document.createElement('em');
            messageEl.textContent = diag.message;
            container.appendChild(messageEl);

            if (0 < diag.hints.length) {
              const hintsEl = document.createElement('div');
              hintsEl.classList.add('typst-mate-diag-hints');
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
      })
      .filter((diag) => helper.mathObject!.startOffset <= diag.from && diag.to <= helper.mathObject!.endOffset);

    return diagnostics;
  });
};

export const diagnosticsState = StateField.define<TypstMateResult | undefined>({
  create() {
    return undefined;
  },
  update(value, tr) {
    for (const e of tr.effects) if (e.is(diagnosticsStateEffect)) return e.value;

    return value;
  },
});

export const diagnosticsStateEffect = StateEffect.define<TypstMateResult>();

export const updateDiagnosticEffect = (view: EditorView, diags: TypstMateResult) => {
  return view.dispatch({
    effects: diagnosticsStateEffect.of(diags),
  });
};
