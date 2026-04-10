import type { Extension } from '@codemirror/state';

import { extensionManager, viewTracker } from '@/libs/extensionManager';

import { diagnosticsState } from '../shared/extensions/Diagnostic';
import { markdownCore } from './extensions/MarkdownCore';

export function buildExtension() {
  const extensions: Extension[] = [
    markdownCore,
    diagnosticsState,
    viewTracker('markdown'),

    ...extensionManager.buildExtensions('markdown'),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
