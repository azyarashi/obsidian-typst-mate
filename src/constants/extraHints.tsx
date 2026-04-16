import type { EditorView } from '@codemirror/view';
import type { JSX } from 'preact';

import './extraHints.css';

export type ExtraHint = (view: EditorView, doc: string, from: number, to: number) => JSX.Element;

export const EXTRA_HINTS: Readonly<Record<string, readonly ExtraHint[]>> = {
  // * ExpectedExpression
  ExpectedExpressionAfterHash: [
    (view, _doc, from, _to) => (
      <>
        Do you want to type a hash? Escape the hash{' '}
        <button
          className="typstmate-button-link"
          onClick={() => {
            view.dispatch({
              changes: { from: from - 1, insert: '\\' },
            });
          }}
        >
          by adding a backslash before it
        </button>
        .
      </>
    ),
    (_view, _doc, _from, _to) => (
      <>
        Do you want to add an expression (e.g. a set rule)? Type it after the hash.{' '}
        <a href="https://typst.app/docs/reference/scripting">Learn more here</a>.
      </>
    ),
  ],
};
