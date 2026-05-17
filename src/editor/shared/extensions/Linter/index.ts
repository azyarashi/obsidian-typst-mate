import { defineExtension } from '@/managers/extensionManager';

export * from './extension';

import { linterExtension } from './extension';
import { linterPackage } from './package';

export const linterEntry = defineExtension()(() => ({
  package: linterPackage(),
  factory: () => linterExtension,
}));
