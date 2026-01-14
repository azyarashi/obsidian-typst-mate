import type { Extension } from '@codemirror/state';
import type { EditorHelper } from '../..';
import { codeblockPreviewExtension } from '../../markdown/extensions/decorations/CodeblockPreview';
import { inlinePreviewExtension } from '../../markdown/extensions/popup/InlinePreview';
import { shortcutExtension } from './actions/Shortcut';
import { suggestExtension } from './actions/Suggest';
import { tabJumpExtension } from './actions/TabJump';
import { debugAstExtension } from './core/Debug';
import { editorHelperFacet } from './core/Helper';
import { typstMateCore } from './core/TypstMate';
import { bracketHighlightExtension } from './decorations/BracketPairHighlight';
import { diagnosticExtension, diagnosticsState } from './decorations/Diagnostic';
import { mathSymbolConcealExtension } from './decorations/SymbolConceal';
import { typstSyntaxHighlightExtension } from './decorations/SyntaxHighlight';
import { typstTheme } from './decorations/theme';
import { toolTipsExtension } from './popup/ToolTips';

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Shared State & Facet
    editorHelperFacet.of(editorHelper),
    typstMateCore,

    // Decorations
    [diagnosticsState, diagnosticExtension],
    codeblockPreviewExtension,
    bracketHighlightExtension,
    mathSymbolConcealExtension,
    typstSyntaxHighlightExtension,

    // Actions
    shortcutExtension,
    suggestExtension,
    tabJumpExtension,
    debugAstExtension,
    inlinePreviewExtension,
    toolTipsExtension,

    // Themes
    typstTheme,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
