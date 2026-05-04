import type { EditorView } from '@codemirror/view';
import { render } from 'preact';
import { getExtraHints } from '@/constants/extraHints';
import type { TypstDiagnostic } from '@/editor';

import './Diagnostic.css';

type DiagnosticProps = { diagnostic: TypstDiagnostic; state?: { doc: string; view: EditorView } };

export function Diagnostic({ diagnostic, state }: DiagnosticProps) {
  const { severity, message, hints } = diagnostic;

  const allHints = state ? [...hints, ...getExtraHints(state.view, diagnostic, state.doc)] : hints;
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
