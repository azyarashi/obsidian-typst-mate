import type { Extension } from '@codemirror/state';
import { clickableLinkExtension, diagnosticsState, markdownCore } from '@/editor';
import { extensionManager, viewTracker } from '@/libs/extensionManager';

export function buildMarkdownExtension(): Extension[] {
  const extensions: Extension[] = [
    viewTracker('markdown'),
    markdownCore,
    diagnosticsState,

    clickableLinkExtension,

    ...extensionManager.buildExtensions('markdown'),
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
