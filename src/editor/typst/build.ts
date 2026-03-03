import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
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

import type { EditorHelper } from '@/editor';
import { shortcutExtension } from '@/editor/shared/extensions/actions/Shortcut';
import { tabJumpExtensionForTypstText } from '@/editor/shared/extensions/actions/TabJump';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { typstSyntaxHighlighting, typstTextCore } from '@/editor/shared/extensions/core/TypstMate';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';
import { mathSymbolConcealExtension } from '@/editor/shared/extensions/decorations/MathSymbolConceal';
import { PairHighlightExtension } from '@/editor/shared/extensions/decorations/PairHighlight';
import { obsidianTheme, typstTheme } from '@/editor/shared/extensions/decorations/Theme';
import { snippetSuggestExtension } from '@/editor/shared/extensions/popup/SnippetSuggest';
import { symbolSuggestExtension } from '@/editor/shared/extensions/popup/SymbolSuggest';
import { jumpFromClickExtension } from './extensions/actions/JumpFromClick';
import { jumpToPreviewExtension } from './extensions/actions/JumpToPreview';
import { errorLensExtension } from './extensions/decorations/ErrorLens';
import { indentRainbowExtension } from './extensions/decorations/IndentRainbow';
import { statusBarExtension } from './extensions/decorations/StatusBar';
import { typstTextViewTheme } from './extensions/decorations/Theme';

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
    jumpToPreviewExtension,

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

    diagnosticsState,
    lintGutter(),
    errorLensExtension,

    mathSymbolConcealExtension,
    PairHighlightExtension(),

    typstSyntaxHighlighting(),
    highlightTrailingWhitespace(),
    indentRainbowExtension,

    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    editorHelper.plugin.settings.useObsidianTheme ? obsidianTheme : typstTheme,
    typstTextViewTheme,
    statusBarExtension,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
