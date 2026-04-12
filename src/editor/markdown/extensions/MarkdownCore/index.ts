import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { markdownCore } from './extension';
import { markdownCorePackage } from './package';

export const markdownCoreEntry = defineExtension()(() => ({
  package: markdownCorePackage(),
  factory: (_context, _settings) => markdownCore,
}));
