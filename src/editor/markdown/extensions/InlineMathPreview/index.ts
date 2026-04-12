import { defineExtension } from '@/libs/extensionManager';
import { inlinePreviewExtension } from './extension';
import { inlinePreviewPackage } from './package';

export const inlinePreviewEntry = defineExtension()(() => ({
  package: inlinePreviewPackage(),
  factory: () => inlinePreviewExtension,
}));
