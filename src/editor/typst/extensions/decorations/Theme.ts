import { EditorView } from '@codemirror/view';

export const typstTextViewTheme = EditorView.theme({
  '.cm-activeLine': { backgroundColor: 'var(--background-primary-alt) !important' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--background-primary-alt) !important' },
  '.cm-selectionMatch': { backgroundColor: 'var(--text-highlight-bg) !important' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: 'none !important',
    marginInlineEnd: '3pt',
    fontSize: 'var(--font-ui-smaller)',
    fontVariant: 'tabular-nums',
  },
  '.cm-lineNumbers .cm-gutterElement': { color: 'var(--text-faint) !important' },
  '.cm-content': {
    caretColor: 'var(--text-normal) !important',
  },
});
