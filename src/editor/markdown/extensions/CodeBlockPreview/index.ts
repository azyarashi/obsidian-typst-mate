import { defineExtension } from '@/libs/extensionManager';
import { codeblockPreviewExtension } from './extension';
import { codeblockPreviewPackage } from './package';

export const codeblockPreviewEntry = defineExtension()(() => ({
  package: codeblockPreviewPackage(),
  factory: () => codeblockPreviewExtension,
}));
