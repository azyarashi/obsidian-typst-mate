import type { Extension } from '@codemirror/state';
import type { EditorHelper } from '../editor';
import { createBracketHighlightExtension } from './decorations/bracket-highlight';
import { createCodeBlockPreviewExtension } from './decorations/codeblockPreview';
import { createDiagnosticExtension, diagnosticsState } from './decorations/diagnostic';
import { createMathSymbolConcealExtension } from './decorations/math-symbol-conceal';

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Decorations
    [diagnosticsState, createDiagnosticExtension(editorHelper)],
    createCodeBlockPreviewExtension(editorHelper),
    editorHelper.plugin.settings.disableBracketHighlight ? [] : createBracketHighlightExtension(editorHelper),
    createMathSymbolConcealExtension(editorHelper),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
