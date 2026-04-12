import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { search, searchKeymap } from '@codemirror/search';
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
import { typstSyntaxHighlighting } from '../../editor/shared/extensions/SyntaxHighlight';
import { obsidianTheme } from '../../editor/shared/extensions/Theme';
import { typstTextViewTheme } from '../../editor/typst/extensions/Theme';
import { typstTextCore } from '../../editor/typst/extensions/TypstCore';

export interface MiniEditorOptions {
  language?: Extension;
  lineNumbers?: boolean;
}

export function buildMiniEditorExtensions(options: MiniEditorOptions = {}): Extension[] {
  const { language, lineNumbers: showLineNumbers = true } = options;

  return [
    ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : []),
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
    EditorView.lineWrapping,
    ...(language ? [language] : []),
  ];
}

export function buildTypstMiniEditorExtensions(): Extension[] {
  return [
    typstTextCore,

    typstTextViewTheme,
    obsidianTheme,

    ...buildMiniEditorExtensions({ language: typstSyntaxHighlighting() }),
  ];
}

// TODO: Json, Toml
