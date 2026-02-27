import type { Extension } from '@codemirror/state';
import { EditorView, lineNumbers, type ViewPlugin } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { jumpFromClickExtension } from '@/editor/shared/extensions/actions/JumpFromClick';
import { shortcutExtension } from '@/editor/shared/extensions/actions/Shortcut';
import { tabJumpExtension } from '@/editor/shared/extensions/actions/TabJump';
import { debuggerExtension } from '@/editor/shared/extensions/core/Debugger';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { typstTextCore } from '@/editor/shared/extensions/core/TypstMate';
import { bracketHighlightExtension } from '@/editor/shared/extensions/decorations/BracketHighlight';
import { diagnosticsState } from '@/editor/shared/extensions/decorations/Diagnostic';
import { mathSymbolConcealExtension } from '@/editor/shared/extensions/decorations/MathSymbolConceal';
import { snippetSuggestExtension } from '@/editor/shared/extensions/popup/SnippetSuggest';
import { symbolSuggestExtension } from '@/editor/shared/extensions/popup/SymbolSuggest';

import '@/editor/shared/css';

const symbolPlugin = symbolSuggestExtension;
const snippetPlugin = snippetSuggestExtension[1] as ViewPlugin<any>;

export function buildTypstTextExtensions(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Core
    editorHelperFacet.of(editorHelper),
    typstTextCore,
    debuggerExtension,
    lineNumbers(),
    EditorView.lineWrapping,
    EditorView.theme({
      '& .cm-gutters': {
        backgroundColor: 'transparent',
        borderRight: 'none !important',
        marginInlineEnd: 'var(--file-folding-offset)',
        fontSize: 'var(--font-ui-smaller)',
        fontVariant: 'tabular-nums',
      },
      '& .cm-lineNumbers .cm-gutterElement': { color: 'var(--text-faint) !important' },
    }),

    // Decorations
    diagnosticsState,
    bracketHighlightExtension(),
    mathSymbolConcealExtension,

    // Actions
    jumpFromClickExtension,
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
