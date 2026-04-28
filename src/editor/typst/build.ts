import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightTrailingWhitespace,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { diagnosticsState } from '@/editor/shared/extensions/Linter/extension';
import { extensionManager, viewTracker } from '@/libs/extensionManager';
import { typstTextViewTheme } from './extensions/Theme';
import { typstTextCore } from './extensions/TypstCore';

export function buildTypstTextExtensions() {
  const extensions: Extension[] = [
    viewTracker('typst'),
    typstTextCore,
    typstTextViewTheme,
    diagnosticsState,
    ...extensionManager.buildExtensions('typst'),

    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,

    history(),
    search(),
    closeBrackets(),
    highlightSelectionMatches({ minSelectionLength: 2 }),

    keymap.of([
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...historyKeymap,
      { key: 'Tab', run: indentMore },
      { key: 'Shift-Tab', run: indentLess },

      ...standardKeymap,
    ]),

    highlightTrailingWhitespace(),

    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
