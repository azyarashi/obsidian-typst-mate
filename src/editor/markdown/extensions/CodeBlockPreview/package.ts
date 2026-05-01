import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const codeblockPreviewPackage: ExtensionPackageFn = () => ({
  id: 'codeblock-preview',
  name: t('settings.extensions.codeblockPreviewName'),
  icon: ICONS.ScanEye,
  description: t('settings.extensions.codeblockPreviewDesc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [],
});
