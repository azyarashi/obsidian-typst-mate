import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { pairHighlightExtension } from './extension';
import { pairHighlightPackage } from './package';

export const pairHighlightEntry = defineExtension()(() => ({
  package: pairHighlightPackage(),
  factory: () => pairHighlightExtension,
}));
