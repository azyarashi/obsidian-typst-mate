import type { Extension } from '@codemirror/state';

import type { EditorHelper } from '@/editor';
import { createBracketHighlightExtension } from './decorations/BracketHighlight';
import { createDiagnosticExtension, diagnosticsState } from './decorations/Diagnostic';
import { createMathSymbolConcealExtension } from './decorations/MathSymbolConceal';

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Decorations
    [diagnosticsState, createDiagnosticExtension(editorHelper)],
    editorHelper.plugin.settings.disableBracketHighlight ? [] : createBracketHighlightExtension(editorHelper),
    createMathSymbolConcealExtension(editorHelper),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
