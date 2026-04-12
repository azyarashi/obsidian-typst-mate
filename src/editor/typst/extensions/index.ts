import type { ExtensionEntry } from '@/libs/extensionManager';

export { jumpToPreviewTargetFacet } from './JumpToPreview/extension';

import { errorLensEntry } from './ErrorLens';
import { indentRainbowEntry } from './IndentRainbow';
import { jumpToPreviewEntry } from './JumpToPreview';
import { statusBarEntry } from './StatusBar';
import { typstCoreEntry } from './TypstCore';
import { vimEntry } from './Vim';
import { zoomEntry } from './Zoom';

export const typstExtensionEntries: (() => ExtensionEntry<any>)[] = [
  typstCoreEntry,
  errorLensEntry,
  indentRainbowEntry,
  jumpToPreviewEntry,
  statusBarEntry,
  vimEntry,
  zoomEntry,
];
