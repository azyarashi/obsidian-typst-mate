import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const debuggerPackage: ExtensionPackageFn = () => ({
  id: 'debugger',
  name: t('settings.extensions.debuggerName'),
  icon: ICONS.Bug,
  description: t('settings.extensions.debuggerDesc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  defaultEnabled: false,
  displayOrder: 9999,
  settings: [],
});
