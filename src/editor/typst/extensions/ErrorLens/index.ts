import { defineExtension } from '@/managers/extensionManager';
import { errorLensExtension } from './extension';
import { errorLensPackage } from './package';

export const errorLensEntry = defineExtension()(() => ({
  package: errorLensPackage(),
  factory: () => errorLensExtension,
}));
