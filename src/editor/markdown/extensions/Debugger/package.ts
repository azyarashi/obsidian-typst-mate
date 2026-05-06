import { ICONS } from '@/constants/icons';
import type { ExtensionPackageFn } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const debuggerPackage: ExtensionPackageFn = () => ({
  id: 'debugger',
  name: t('settings.extensions.debugger.name'),
  icon: ICONS.Bug,
  description: tFragment('settings.extensions.debugger.desc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  defaultEnabled: false,
  displayOrder: 9999,
  settings: [],
});
