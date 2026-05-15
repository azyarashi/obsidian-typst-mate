import { EditorView } from '@codemirror/view';

export const textViewTheme = [
  EditorView.theme({
    '&': { height: '100%' },
    '.cm-activeLine': { backgroundColor: 'var(--background-secondary) !important' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--background-secondary) !important' },
    '.cm-selectionMatch': { backgroundColor: 'var(--text-highlight-bg) !important' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: 'none !important',
      marginInlineEnd: '3pt',
      fontSize: 'var(--font-ui-smaller)',
      fontVariant: 'tabular-nums',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: 'var(--text-faint) !important',
      backgroundColor: 'var(--background-primary-alt) !important',
    },
    '.cm-content': { caretColor: 'var(--text-normal) !important' },
  }),
];
