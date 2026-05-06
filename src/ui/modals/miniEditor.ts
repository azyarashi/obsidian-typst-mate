import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, standardKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
} from '@codemirror/view';
import { obsidianTheme, typstSyntaxHighlighting, typstTextCore } from '@/editor';
import { RenderingEngine } from '@/libs';

export const getMiniEditorExtensions = (engine?: RenderingEngine): Extension[] => {
  const extensions: Extension[] = [];

  if (engine !== RenderingEngine.MathJax) extensions.push(typstTextCore, typstSyntaxHighlighting(), obsidianTheme);

  extensions.push(
    history(),
    drawSelection(),
    highlightSpecialChars(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightActiveLineGutter(),

    EditorState.tabSize.of(2),
    EditorView.lineWrapping,

    keymap.of([...standardKeymap, ...historyKeymap, ...closeBracketsKeymap]),
  );

  return extensions;
};
