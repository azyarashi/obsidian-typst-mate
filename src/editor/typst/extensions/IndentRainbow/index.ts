import { defineExtension } from '@/managers/extensionManager';
import { indentRainbowExtension } from './extension';
import { indentRainbowPackage } from './package';

export const indentRainbowEntry = defineExtension()(() => ({
  package: indentRainbowPackage(),
  factory: () => indentRainbowExtension,
}));
