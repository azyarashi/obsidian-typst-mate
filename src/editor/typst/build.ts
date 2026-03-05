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
import { diagnosticsState } from '@/editor/shared/extensions/Diagnostic';
import { helperFacet } from '@/editor/shared/extensions/Helper';
import { jumpFromClickExtension } from '@/editor/shared/extensions/JumpFromClick';
import { mathSymbolConcealExtension } from '@/editor/shared/extensions/MathSymbolConceal';
import { pairHighlightExtension } from '@/editor/shared/extensions/PairHighlight';
import { shortcutExtension } from '@/editor/shared/extensions/Shortcut';
import { typstSyntaxHighlighting } from '@/editor/shared/extensions/SyntaxHighlight';
import { tabJumpExtensionForTypstText } from '@/editor/shared/extensions/TabJump';
import { obsidianTheme, typstTheme } from '@/editor/shared/extensions/Theme';
import { linterExtension } from '../shared/extensions/Linter';
import { snippetSuggestExtension } from '../shared/extensions/SnippetSuggest';
import { errorLensExtension } from './extensions/ErrorLens';
import { indentRainbowExtension } from './extensions/IndentRainbow';
import { jumpToPreviewExtension } from './extensions/JumpToPreview';
import { statusBarExtension } from './extensions/StatusBar';
import { typstTextViewTheme } from './extensions/Theme';
import { typstTextCore } from './extensions/TypstCore';

export function buildTypstTextExtensions(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    helperFacet.of(editorHelper),
    typstTextCore,

    EditorState.tabSize.of(2),
    EditorView.lineWrapping,

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
    linterExtension,
    lintGutter(),
    errorLensExtension,

    mathSymbolConcealExtension,
    pairHighlightExtension,

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
