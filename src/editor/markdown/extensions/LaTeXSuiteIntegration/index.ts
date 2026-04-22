import { defineExtension } from '@/libs/extensionManager';
import { latexSuiteIntegrationExtension } from './extension';
import { latexSuiteIntegrationPackage } from './package';

export const latexSuiteIntegrationEntry = defineExtension()(() => ({
  package: latexSuiteIntegrationPackage(),
  factory: (_context, settings: { enabled?: boolean }) => latexSuiteIntegrationExtension(settings.enabled ?? true),
}));
