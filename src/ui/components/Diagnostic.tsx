import type { EditorView } from '@codemirror/view';
import { type JSX, render } from 'preact';
import { EXTRA_HINTS } from '@/constants/extraHints';
import type { TypstDiagnostic } from '@/editor/shared/extensions/Linter/extension';

import './Diagnostic.css';

type DiagnosticProps = { diagnostic: TypstDiagnostic; state?: { doc: string; view: EditorView } };

export function Diagnostic({ diagnostic, state }: DiagnosticProps) {
  const { severity, message, hints } = diagnostic;

  const extraHints: JSX.Element[] = [];
  // TODO: 次のバージョンでおそらく変わる
  if (state) {
    if (
      message === 'expected expression' &&
      diagnostic.from === diagnostic.to &&
      state.doc.slice(diagnostic.from - 1, diagnostic.to) === '#'
    ) {
      const extra = EXTRA_HINTS.ExpectedExpressionAfterHash ?? [];
      extraHints.push(...extra.map((fn) => fn(state.view, state.doc, diagnostic.from, diagnostic.to)));
    }
  }

  const allHints = [...hints, ...extraHints];

  return (
    <>
      <div className={`typstmate-diag-message`}>
        {severity === 'error' ? `Error: ${message}` : `Warning: ${message}`}
      </div>

      {0 < allHints.length && (
        <>
          <div className="typstmate-diag-hint-label">
            {severity === 'error' ? 'How to fix this?' : "What's this about?"}
          </div>
          <div className="typstmate-diag-hints">
            {allHints.map((hint, i) => (
              <div key={i} className="typstmate-diag-hint">
                <span className="typstmate-diag-hint-arrow">→</span>
                <span>{hint}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function renderDiagnosticMessage(props: DiagnosticProps): HTMLElement {
  const container = document.createElement('div');
  container.className = `typstmate-diag typstmate-diag-severity-${props.diagnostic.severity}`;
  render(<Diagnostic {...props} />, container);
  return container;
}
