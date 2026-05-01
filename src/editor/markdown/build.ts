import type { Extension } from '@codemirror/state';
import { extensionManager, viewTracker } from '@/libs/extensionManager';
import { diagnosticsState } from '../shared/extensions/Linter/extension';
import { markdownCore } from './extensions/MarkdownCore';
import { clickableLinkExtension } from '../shared/internal/ClickableLink';
export function buildExtension() {
  const extensions: Extension[] = [
    markdownCore,
    diagnosticsState,
    viewTracker('markdown'),

    ...extensionManager.buildExtensions('markdown'),
    clickableLinkExtension,
  ];

  return extensions.filter((ext) => !Array.isArray(ext) || (Array.isArray(ext) && ext.length !== 0));
}
