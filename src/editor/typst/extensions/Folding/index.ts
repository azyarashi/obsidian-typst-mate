import { defineExtension } from '@/libs/extensionManager';
import { typstFoldingExtension } from './extension';
import { foldingPackage } from './package';
export const foldingEntry = defineExtension()(() => ({
  package: foldingPackage(),
  factory: () => typstFoldingExtension,
}));
