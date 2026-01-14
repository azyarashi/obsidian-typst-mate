import { EditorView } from '@codemirror/view';

import './theme.css';
import { CSSClass } from '@/utils/rust/crates/typst-synatx/';

// https://typst.app/play/
export const typstTheme = EditorView.theme({
  [`.${CSSClass.Comment}`]: { color: 'var(--typstmate-c-comment) !important' },
  [`.${CSSClass.Escape}`]: { color: 'var(--typstmate-c-escape) !important' },
  [`.${CSSClass.Strong}`]: { fontWeight: '700 !important' },
  [`.${CSSClass.Emph}`]: { fontStyle: 'italic !important' },
  [`.${CSSClass.Link}`]: { textDecoration: 'underline !important' },
  [`.${CSSClass.Raw}`]: { color: 'var(--typstmate-c-monospace) !important' },
  [`.${CSSClass.Label}`]: { color: 'var(--typstmate-c-escape) !important' },
  [`.${CSSClass.Ref}`]: { color: 'var(--typstmate-c-escape) !important' },
  [`.${CSSClass.Heading}`]: { fontWeight: '700 !important', textDecoration: 'underline !important' },
  [`.${CSSClass.ListMarker}`]: { color: 'var(--typstmate-c-list-marker) !important' },
  [`.${CSSClass.ListTerm}`]: { fontWeight: '700 !important' },
  [`.${CSSClass.MathDelimiter}`]: { color: 'var(--typstmate-c-math-delim) !important' },
  [`.${CSSClass.MathOperator}`]: { color: 'var(--typstmate-c-math-op) !important' },
  [`.${CSSClass.Keyword}`]: { color: 'var(--typstmate-c-keyword) !important' },
  [`.${CSSClass.Number}`]: { color: 'var(--typstmate-c-number) !important' },
  [`.${CSSClass.String}`]: { color: 'var(--typstmate-c-string) !important' },
  [`.${CSSClass.Function}`]: { color: 'var(--typstmate-c-func) !important' },
  [`.${CSSClass.Interpolated}`]: { color: 'var(--typstmate-c-interpolated) !important' },

  [`.${CSSClass.Text}`]: { color: 'var(--text-normal)' },
  [`.${CSSClass.BracketEnclosing}`]: { backgroundColor: 'var(--text-highlight-bg) !important' },
});
