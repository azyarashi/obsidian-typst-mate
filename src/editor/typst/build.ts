import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { jumpFromClickExtension } from '@/editor/shared/extensions/actions/JumpFromClick';
import { shortcutExtension } from '@/editor/shared/extensions/actions/Shortcut';
import { tabJumpExtensionForTypstText } from '@/editor/shared/extensions/actions/TabJump';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { typstSyntaxHighlighting, typstTextCore } from '@/editor/shared/extensions/core/TypstMate';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';
import { mathSymbolConcealExtension } from '@/editor/shared/extensions/decorations/MathSymbolConceal';
import { PairHighlightExtension } from '@/editor/shared/extensions/decorations/PairHighlight';
import { typstTheme } from '@/editor/shared/extensions/decorations/Theme';
import { snippetSuggestExtension } from '@/editor/shared/extensions/popup/SnippetSuggest';
import { symbolSuggestExtension } from '@/editor/shared/extensions/popup/SymbolSuggest';
import { errorLensExtension } from '@/editor/typst/extensions/decorations/ErrorLens';
import { statusBarExtension } from '@/editor/typst/extensions/decorations/StatusBar';
import { typstTextViewTheme } from '@/editor/typst/extensions/decorations/Theme';

import '@/editor/shared/css';

export function buildTypstTextExtensions(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    editorHelperFacet.of(editorHelper),
    typstTextCore,

    EditorState.tabSize.of(2),
    EditorView.lineWrapping,

    symbolSuggestExtension,
    snippetSuggestExtension,
    shortcutExtension,
    tabJumpExtensionForTypstText,
    jumpFromClickExtension,

    history(),
    search(),
    closeBrackets(),
    highlightSelectionMatches({ minSelectionLength: 2 }),

    // @ts-expect-error
    keymap.of([
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...historyKeymap,
      { key: 'Tab', run: indentMore },
      { key: 'Shift-Tab', run: indentLess },

      ...standardKeymap,
    ]),

    diagnosticsState,
    lintGutter(),
    errorLensExtension,

    mathSymbolConcealExtension,
    PairHighlightExtension(),

    typstSyntaxHighlighting(),

    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    typstTheme,
    typstTextViewTheme,
    statusBarExtension,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
