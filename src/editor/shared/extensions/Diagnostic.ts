import { type Diagnostic, setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import type { Processor } from '@/libs/processor';

import './Diagnostic.css';

interface TypstDiagnostic extends Diagnostic {
  severity: 'error' | 'warning';
  hints: string[];
}

export interface TypstMateResult {
  diagnostics: TypstDiagnostic[];
  processor?: Processor;
  offset: number;
  noDiag: boolean;
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
};

export const clearDiagnosticEffect = (view: EditorView) => {
  view.dispatch({
    effects: diagnosticsStateEffect.of(undefined),
  });
  // TODO
  view.dispatch(setDiagnostics(view.state, []));
};
