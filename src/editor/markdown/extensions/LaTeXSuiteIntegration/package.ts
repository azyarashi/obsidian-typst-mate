import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const latexSuiteIntegrationPackage: ExtensionPackageFn = () => ({
  id: 'latex-suite-integration',
  name: t('settings.extensions.latexSuiteIntegration.name'),
  icon: ICONS.CircuitBoard,
  description: t('settings.extensions.latexSuiteIntegration.desc'),
  tags: [],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [],
});
