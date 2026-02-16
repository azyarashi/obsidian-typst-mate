import type { Extension } from '@codemirror/state';
import { EditorView, type ViewPlugin } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { shortcutExtension } from './actions/Shortcut';
import { tabJumpExtension } from './actions/Tabjump';
import { debuggerExtension } from './core/Debugger';
import { editorHelperFacet } from './core/Helper';
import { typstMateCore } from './core/TypstMate';
import { bracketHighlightExtension } from './decorations/BracketHighlight';
import { diagnosticExtension, diagnosticsState } from './decorations/Diagnostic';
import { mathSymbolConcealExtension } from './decorations/MathSymbolConceal';
import { snippetSuggestExtension } from './popup/SnippetSuggest';
import { symbolSuggestExtension } from './popup/SymbolSuggest';

const symbolPlugin = symbolSuggestExtension;
const snippetPlugin = snippetSuggestExtension[1] as ViewPlugin<any>;

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Core
    editorHelperFacet.of(editorHelper),
    typstMateCore,
    debuggerExtension,

    // Decorations
    diagnosticsState,
    diagnosticExtension,
    editorHelper.plugin.settings.disableBracketHighlight ? [] : bracketHighlightExtension(),
    mathSymbolConcealExtension,

    // Actions
    shortcutExtension,
    tabJumpExtension,

    // Popups
    symbolSuggestExtension,
    snippetSuggestExtension,
    EditorView.domEventHandlers({
      keydown: (e, view) => {
        const symbolSuggestPlugin = view.plugin(symbolPlugin);
        const snippetSuggestPlugin = view.plugin(snippetPlugin);

        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          symbolSuggestPlugin?.hide();
          snippetSuggestPlugin?.hide();
          return false;
        }

        if (symbolSuggestPlugin?.onKeyDown(e)) return true;
        if (snippetSuggestPlugin?.onKeyDown(e)) return true;

        return false;
      },
    }),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
