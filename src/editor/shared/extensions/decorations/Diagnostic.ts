import { type Diagnostic, setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Processor } from '@/libs/processor';
import { renderDiagnosticMessage } from '@/ui/elements/diagnostics';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion } from '../core/TypstMate';

interface TypstDiagnostic extends Diagnostic {
  hints: string[];
}

interface TypstMateResult {
  diags: TypstDiagnostic[];
  processor?: Processor;
  noDiag: boolean;
}

function computeDiagnostics(view: EditorView, result: TypstMateResult): Diagnostic[] {
  const region = getActiveRegion(view);
  if (!region) return [];

  if (result.noDiag) return [];

  const helper = view.state.facet(editorHelperFacet);
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
  } else offset = 0;

  const docLength = view.state.doc.length;

  const mapped = result.diags
    .map((diag) => {
      let from = Math.max(region.from, Math.min(diag.from + offset, docLength));
      let to = Math.max(region.from, Math.min(diag.to + offset, docLength));

      if (from > to) {
        const temp = from;
        from = to;
        to = temp;
      }

      if (from === to) {
        const line = view.state.doc.lineAt(from);
        if (from < line.to) to++;
        else if (from > line.from) from--;
        else return null;
      }

      return {
        from,
        to,
        message: diag.message || 'Error',
        severity: diag.severity,
        renderMessage: () =>
          renderDiagnosticMessage({
            severity: diag.severity as 'error' | 'warning' | 'info' | 'hint',
            message: diag.message,
            hints: diag.hints,
          }),
      } as Diagnostic;
    })
    .filter((x) => x !== null) as Diagnostic[];

  const uniqueDiags: Diagnostic[] = [];
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
