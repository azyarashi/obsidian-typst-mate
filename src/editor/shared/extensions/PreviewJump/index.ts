import { defineExtension } from '@/libs/extensionManager';

export * from './extension';

import { previewJumpExtension } from './extension';
import { previewJumpPackage } from './package';

export const previewJumpEntry = defineExtension()(() => ({
  package: previewJumpPackage(),
  factory: () => previewJumpExtension,
}));
