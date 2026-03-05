import type { Extension } from '@codemirror/state';

import type { EditorHelper } from '@/editor';
import { diagnosticsState } from '../shared/extensions/Diagnostic';
import { helperFacet } from '../shared/extensions/Helper';
import { jumpFromClickExtension } from '../shared/extensions/JumpFromClick';
import { mathMacroExtension } from '../shared/extensions/MathMacro';
import { mathSymbolConcealExtension } from '../shared/extensions/MathSymbolConceal';
import { pairHighlightExtension } from '../shared/extensions/PairHighlight';
import { shortcutExtension } from '../shared/extensions/Shortcut';
import { snippetSuggestExtension } from '../shared/extensions/SnippetSuggest';
import { typstSyntaxHighlighting } from '../shared/extensions/SyntaxHighlight';
import { tabJumpExtension } from '../shared/extensions/TabJump';
import { obsidianTheme, typstTheme } from '../shared/extensions/Theme';
import { codeblockPreviewExtension } from './extensions/CodeBlockPreview';
import { debuggerExtension } from './extensions/Debugger';
import { inlinePreviewExtension } from './extensions/InlineMathPreview';
import { markdownCore } from './extensions/MarkdownCore';

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Core
    helperFacet.of(editorHelper),
    markdownCore,

    // Decorations
    diagnosticsState,
    pairHighlightExtension,
    mathSymbolConcealExtension,

    // Popups
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

    editorHelper.plugin.settings.useObsidianTheme ? obsidianTheme : typstTheme,
    debuggerExtension,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
