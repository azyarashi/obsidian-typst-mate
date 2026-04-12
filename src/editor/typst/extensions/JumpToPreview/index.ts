import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { jumpToPreviewExtension } from './extension';
import { jumpToPreviewPackage } from './package';

export const jumpToPreviewEntry = defineExtension()(() => ({
  package: jumpToPreviewPackage(),
  factory: () => jumpToPreviewExtension,
}));
