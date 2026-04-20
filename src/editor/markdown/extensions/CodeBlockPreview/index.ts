import { defineExtension } from '@/libs/extensionManager';
import { codeblockPreviewExtension } from './extension';
import { codeblockPreviewPackage } from './package';

export const codeblockPreviewEntry = defineExtension()(() => ({
  package: codeblockPreviewPackage(),
  factory: (_context, settings: { enabled?: boolean }) => codeblockPreviewExtension(settings.enabled ?? true),
}));
