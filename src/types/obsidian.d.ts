import type { EditorView } from '@codemirror/view';

declare module 'obsidian' {
  interface Editor {
    cm: EditorView;
  }
}
