import { EditorView } from '@codemirror/view';

import { CSSClass } from '@/utils/crates/typst-syntax';

import './Theme.css';

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
  '.typstmate-bracket-pair': { backgroundColor: 'var(--text-highlight-bg) !important' },
});

// https://docs.obsidian.md/Reference/CSS+variables/Editor/Code
export const obsidianTheme = EditorView.theme({
  [`.${CSSClass.Comment}`]: { color: 'var(--code-comment) !important' },
  [`.${CSSClass.Escape}`]: { color: 'var(--code-important) !important' },
  [`.${CSSClass.Strong}`]: { fontWeight: '700 !important' },
  [`.${CSSClass.Emph}`]: { fontStyle: 'italic !important' },
  [`.${CSSClass.Link}`]: { textDecoration: 'underline !important', color: 'var(--link-color)' },
  [`.${CSSClass.Raw}`]: { color: 'var(--code-comment) !important' },
  [`.${CSSClass.Label}`]: { color: 'var(--code-tag) !important' },
  [`.${CSSClass.Ref}`]: { color: 'var(--code-tag) !important' },
  [`.${CSSClass.Heading}`]: { fontWeight: '700 !important', textDecoration: 'underline !important' },
  [`.${CSSClass.ListMarker}`]: { color: 'var(--code-punctuation) !important' },
  [`.${CSSClass.ListTerm}`]: { fontWeight: '700 !important' },
  [`.${CSSClass.MathDelimiter}`]: { color: 'var(--code-punctuation) !important' },
  [`.${CSSClass.MathOperator}`]: { color: 'var(--code-operator) !important' },
  [`.${CSSClass.Keyword}`]: { color: 'var(--code-keyword) !important' },
  [`.${CSSClass.Number}`]: { color: 'var(--code-value) !important' },
  [`.${CSSClass.String}`]: { color: 'var(--code-string) !important' },
  [`.${CSSClass.Function}`]: { color: 'var(--code-function) !important' },
  [`.${CSSClass.Interpolated}`]: { color: 'var(--code-tag) !important' },

  [`.${CSSClass.Text}`]: { color: 'var(--text-normal)' },
  '.typstmate-bracket-pair': { backgroundColor: 'var(--text-highlight-bg) !important' },
});
