import type { Extension } from '@codemirror/state';
import type { EditorHelper } from '../editor';
import { createDiagnosticExtension, diagnosticsState } from './decorations/diagnostic';

export function buildExtension(editorHelper: EditorHelper) {
  const extensions: Extension[] = [
    // Decorations
    [diagnosticsState, createDiagnosticExtension(editorHelper)],
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
