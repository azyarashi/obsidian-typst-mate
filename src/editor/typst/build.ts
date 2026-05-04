import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightTrailingWhitespace,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { clickableLinkExtension, diagnosticsState } from '@/editor';
import { textViewTheme } from '@/editorSimple/extensions/Theme';
import { extensionManager, viewTracker } from '@/libs/extensionManager';
import { typstTextCore } from './extensions/TypstCore';
import { typstFoldingExtension } from './internal/Folding';
import { statusBarExtension } from './internal/StatusBar';
import { zoomExtension } from './internal/Zoom';

export function buildTypstTextExtensions() {
  const extensions: Extension[] = [
    viewTracker('typst'),
    typstTextCore,
    textViewTheme,
    diagnosticsState,
    ...extensionManager.buildExtensions('typst'),

    clickableLinkExtension,
    typstFoldingExtension,
    statusBarExtension,
    zoomExtension,

    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,

    history(),
    search(),
    // closeBrackets(),
    highlightSelectionMatches({ minSelectionLength: 2, wholeWords: true }),
    highlightTrailingWhitespace(),

    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),

    // TODO
    keymap.of([
      ...searchKeymap,
      ...historyKeymap,
      { key: 'Tab', run: indentMore },
      { key: 'Shift-Tab', run: indentLess },

      ...standardKeymap,
    ]),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
