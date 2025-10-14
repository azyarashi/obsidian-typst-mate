import { type Diagnostic, linter } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { EditorHelper } from '../..';
import type { MathObject } from '../others/math';

interface TypstDiagnostic extends Diagnostic {
  hints: string[];
}

export const createDiagnosticExtension = (_helper: EditorHelper, getMathObject: () => MathObject | null) => {
  return linter((view) => {
    const mathObject = getMathObject();
    if (!mathObject) return [];

    const diagnostics = view.state.field(diagnosticsState);
    return diagnostics.map((diag) => {
      return {
        from: diag.from - mathObject.startOffset,
        to: diag.to - mathObject.startOffset,
        message: diag.message,
        severity: diag.severity,
      };
    });
  });
};

export const diagnosticsState = StateField.define<TypstDiagnostic[]>({
  create() {
    return [];
  },
  update(value, tr) {
    for (const e of tr.effects) if (e.is(diagnosticsStateEffect)) return e.value;

    return value;
  },
});

export const diagnosticsStateEffect = StateEffect.define<TypstDiagnostic[]>();

export const updateDiagnosticEffect = (view: EditorView, diags: TypstDiagnostic[]) => {
  return view.dispatch({
    effects: diagnosticsStateEffect.of(diags),
  });
};
