import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

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
