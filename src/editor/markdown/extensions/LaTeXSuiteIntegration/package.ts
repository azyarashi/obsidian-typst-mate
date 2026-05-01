import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const latexSuiteIntegrationPackage: ExtensionPackageFn = () => ({
  id: 'latex-suite-integration',
  name: t('settings.extensions.latexSuiteIntegrationName'),
  icon: ICONS.TeX,
  description: t('settings.extensions.latexSuiteIntegrationDesc'),
  tags: [],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [],
});
