import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import type { Extension } from '@codemirror/state';
import { EditorView, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';

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
    ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
    history(),
    keymap.of([...historyKeymap, ...standardKeymap, indentWithTab]),
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
