import { defineExtension } from '@/libs/extensionManager';
import { errorLensExtension } from './extension';
import { errorLensPackage } from './package';

export const errorLensEntry = defineExtension()(() => ({
  package: errorLensPackage(),
  factory: () => errorLensExtension,
}));
