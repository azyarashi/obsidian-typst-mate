import type { Extension } from '@codemirror/state';

import { codeblockPreviewExtension } from './decorations/CodeBlockPreview';
import { inlinePreviewExtension } from './popup/InlineMathPreview';

export function buildExtension() {
  const extensions: Extension[] = [
    // Decorations
    codeblockPreviewExtension,
    inlinePreviewExtension,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
