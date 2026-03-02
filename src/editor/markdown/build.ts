import type { Extension } from '@codemirror/state';
import type { EditorHelper } from '@/editor';
import { codeblockPreviewExtension } from '@/editor/markdown/extensions/decorations/CodeBlockPreview';
import { inlinePreviewExtension } from '@/editor/markdown/extensions/popup/InlineMathPreview';
import { jumpFromClickExtension } from '../shared/extensions/actions/JumpFromClick';
import { mathMacroExtension } from '../shared/extensions/actions/MathMacro';
import { shortcutExtension } from '../shared/extensions/actions/Shortcut';
import { tabJumpExtension } from '../shared/extensions/actions/TabJump';
import { debuggerExtension } from '../shared/extensions/core/Debugger';
import { editorHelperFacet } from '../shared/extensions/core/Helper';
import { typstMateCore, typstSyntaxHighlighting } from '../shared/extensions/core/TypstMate';
import { diagnosticsState } from '../shared/extensions/decorations/Diagnostic';
import { mathSymbolConcealExtension } from '../shared/extensions/decorations/MathSymbolConceal';
import { PairHighlightExtension } from '../shared/extensions/decorations/PairHighlight';
import { typstTheme } from '../shared/extensions/decorations/Theme';
import { snippetSuggestExtension } from '../shared/extensions/popup/SnippetSuggest';
import { symbolSuggestExtension } from '../shared/extensions/popup/SymbolSuggest';

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Core
    editorHelperFacet.of(editorHelper),
    typstMateCore,

    // Decorations
    diagnosticsState,
    PairHighlightExtension(),
    mathSymbolConcealExtension,

    // Popups
    symbolSuggestExtension,
    snippetSuggestExtension,

    // Actions
    jumpFromClickExtension,
    mathMacroExtension,
    shortcutExtension,
    tabJumpExtension,

    // Decorations
    codeblockPreviewExtension,
    inlinePreviewExtension,

    // Syntax Highlighting
    typstSyntaxHighlighting(),

    typstTheme,
    debuggerExtension,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
