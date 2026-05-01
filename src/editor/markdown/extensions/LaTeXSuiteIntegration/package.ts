import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const latexSuiteIntegrationPackage: ExtensionPackageFn = () => ({
  id: 'latex-suite-integration',
  name: t('settings.extensions.latexSuiteIntegration.name'),
  icon: ICONS.TeX,
  description: tFragment('settings.extensions.latexSuiteIntegration.desc'),
  tags: [],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [],
});
