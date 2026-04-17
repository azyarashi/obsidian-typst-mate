import { type Diagnostic, setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { TypstMate } from '@/api';
import type { Processor } from '@/libs/processor';
import type { Diagnostic as WasmDiagnostic } from '@/libs/typstManager/worker';
import { renderDiagnosticMessage } from '@/ui/components/Diagnostic';
import { getActiveRegion } from '../../utils/core';

import './Diagnostic.css';

export interface TypstDiagnostic extends WasmDiagnostic, Diagnostic {
  severity: 'error' | 'warning';
  hints: string[];
}

export interface TypstMateResult {
  diagnostics: TypstDiagnostic[];
  processor?: Processor;
  offset: number;
  noDiag: boolean;
}

export const diagnosticsStateEffect = StateEffect.define<TypstMateResult | undefined>();

export const diagnosticsState = StateField.define<TypstMateResult | undefined>({
  create() {
    return undefined;
  },
  update(value, tr) {
    for (const e of tr.effects) if (e.is(diagnosticsStateEffect)) return e.value;
    return value;
  },
});

export const updateDiagnosticEffect = (view: EditorView, diags: TypstMateResult) => {
  view.dispatch({
    effects: diagnosticsStateEffect.of(diags),
  });
};

export const clearDiagnosticEffect = (view: EditorView) => {
  view.dispatch({
    effects: diagnosticsStateEffect.of(undefined),
  });
  view.dispatch(setDiagnostics(view.state, []));
};

// --- Linter Logic ---

export function getMappedDiagnostics(view: EditorView, result: TypstMateResult): TypstDiagnostic[] {
  if (result.noDiag) return [];

  const region = getActiveRegion(view);
  if (!region) return [];

  const offset = region.from + region.skip + result.offset;
  const docLength = view.state.doc.length;

  const mapped = result.diagnostics.map((diag) => {
    const from = Math.max(region.from, Math.min(diag.from + offset, docLength));
    const to = Math.max(region.from, Math.min(diag.to + offset, docLength));
    return { ...diag, from, to } as TypstDiagnostic;
  });

  const uniqueDiags: TypstDiagnostic[] = [];
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

function computeDiagnostics(view: EditorView, result: TypstMateResult): Diagnostic[] {
  const mapped = getMappedDiagnostics(view, result);

  return mapped.map(
    (diag) =>
      ({
        ...diag,
        renderMessage: () =>
          renderDiagnosticMessage({
            diagnostic: diag,
            state: { view, doc: view.state.doc.toString() },
          }),
      }) as Diagnostic,
  );
}

export const linterExtension = [
  diagnosticsState,

  ViewPlugin.fromClass(
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

        const errorOne = computed.find((d) => d.severity === 'error');
        if (errorOne) TypstMate.update(undefined, { isRendering: false, hasError: true, message: errorOne.message });
        else TypstMate.update(undefined, { ...TypstMate.rendering, hasError: false });

        requestAnimationFrame(() => {
          this.view.dispatch(setDiagnostics(this.view.state, computed));
        });
      }
    },
  ),
];
