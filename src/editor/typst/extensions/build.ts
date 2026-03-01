import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentMore, standardKeymap } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type ViewPlugin,
} from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { jumpFromClickExtension } from '@/editor/shared/extensions/actions/JumpFromClick';
import { shortcutExtension } from '@/editor/shared/extensions/actions/Shortcut';
import { tabJumpExtensionForTypstText } from '@/editor/shared/extensions/actions/TabJump';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { typstSyntaxHighlighting, typstTextCore } from '@/editor/shared/extensions/core/TypstMate';
import { bracketHighlightExtension } from '@/editor/shared/extensions/decorations/BracketPairHighlight';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';
import { mathSymbolConcealExtension } from '@/editor/shared/extensions/decorations/MathSymbolConceal';
import { typstTheme } from '@/editor/shared/extensions/decorations/Theme';
import { snippetSuggestExtension } from '@/editor/shared/extensions/popup/SnippetSuggest';
import { symbolSuggestExtension } from '@/editor/shared/extensions/popup/SymbolSuggest';
import { errorLensExtension } from '@/editor/typst/extensions/decorations/ErrorLens';
import { statusBarExtension } from '@/editor/typst/extensions/decorations/StatusBar';
import { typstTextViewTheme } from '@/editor/typst/extensions/decorations/Theme';

import '@/editor/shared/css';

const symbolPlugin = symbolSuggestExtension;
const snippetPlugin = snippetSuggestExtension[1] as ViewPlugin<any>;

export function buildTypstTextExtensions(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Core
    editorHelperFacet.of(editorHelper),
    typstTextCore,
    diagnosticsState,

    // 表示
    lineNumbers(),
    EditorView.lineWrapping,

    // テーマ
    typstTextViewTheme,
    typstTheme,

    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    search(),
    tabJumpExtensionForTypstText,
    keymap.of([
      // @ts-expect-error
      ...searchKeymap,
      // @ts-expect-error
      ...historyKeymap,
      // @ts-expect-error
      ...standardKeymap,
      // @ts-expect-error
      ...closeBracketsKeymap,
      // @ts-expect-error
      { key: 'Tab', run: indentMore },
      // @ts-expect-error
      { key: 'Shift-Tab', run: indentLess },
    ]),
    // ...searchKeymap,
    highlightSelectionMatches({
      minSelectionLength: 2,
    }),
    closeBrackets(),
    highlightSelectionMatches(),
    //  foldGutter(),

    EditorState.tabSize.of(2),

    // Decorations
    // diagnosticsState,
    lintGutter(),
    errorLensExtension,
    statusBarExtension,
    bracketHighlightExtension(),
    mathSymbolConcealExtension,
    closeBrackets(),

    // Syntax Highlighting
    typstSyntaxHighlighting(),

    // Actions
    jumpFromClickExtension,
    shortcutExtension,

    // Popups
    symbolSuggestExtension,
    snippetSuggestExtension,
    EditorView.domEventHandlers({
      keydown: (e, view) => {
        const symbolSuggestPlugin = view.plugin(symbolPlugin);
        const snippetSuggestPlugin = view.plugin(snippetPlugin);

        if (symbolSuggestPlugin?.onKeyDown(e)) return true;
        if (snippetSuggestPlugin?.onKeyDown(e)) return true;

        return false;
      },
    }),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
