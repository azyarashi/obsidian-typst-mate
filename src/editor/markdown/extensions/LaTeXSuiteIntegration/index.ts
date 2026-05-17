import { defineExtension } from '@/managers/extensionManager';
import { latexSuiteIntegrationExtension } from './extension';
import { latexSuiteIntegrationPackage } from './package';

export const latexSuiteIntegrationEntry = defineExtension()(() => ({
  package: latexSuiteIntegrationPackage(),
  factory: (_context, settings: { enabled?: boolean }) => latexSuiteIntegrationExtension(settings.enabled ?? true),
}));
