import { ICONS } from '@/constants/icons';
import type { ExtensionPackageFn } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

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
