import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { textViewTheme } from './extensions/Theme';

export interface SimpleEditorOptions {
  language?: Extension;
  lineNumbers?: boolean;
}

export function buildSimpleEditorExtensions(options: SimpleEditorOptions = {}): Extension[] {
  const { language, lineNumbers: showLineNumbers = true } = options;

  return [
    ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : []),
    textViewTheme,
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    bracketMatching(),
    indentOnInput(),

    keymap.of([...historyKeymap, ...standardKeymap, ...searchKeymap, ...lintKeymap, ...foldKeymap, indentWithTab]),

    search({ top: true }),
    highlightSelectionMatches({ minSelectionLength: 2, wholeWords: true }),
    EditorView.lineWrapping,
    ...(language ? [language] : []),
  ];
}
