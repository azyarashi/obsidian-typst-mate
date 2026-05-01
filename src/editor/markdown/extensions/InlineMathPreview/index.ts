import { defineExtension } from '@/libs/extensionManager';
import { inlinePreviewExtension } from './extension';
import { inlineMathPreviewPackage } from './package';

export const inlineMathPreviewEntry = defineExtension()(() => ({
  package: inlineMathPreviewPackage(),
  factory: (_context, settings: { enabled?: boolean; disableOnMathJax?: boolean }) =>
    inlinePreviewExtension(settings.enabled ?? true, settings.disableOnMathJax ?? false),
}));
