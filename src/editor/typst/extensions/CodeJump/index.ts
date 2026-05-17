import { defineExtension } from '@/managers/extensionManager';

export * from './extension';

import { codeJumpExtension } from './extension';
import { codeJumpPackage } from './package';

export const codeJumpEntry = defineExtension()(() => ({
  package: codeJumpPackage(),
  factory: () => codeJumpExtension,
}));
