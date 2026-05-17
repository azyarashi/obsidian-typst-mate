import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/libs/i18n';
import type { ExtensionPackageFn } from '@/managers/extensionManager';

export const codeblockPreviewPackage: ExtensionPackageFn = () => ({
  id: 'codeblock-preview',
  name: t('settings.extensions.codeblockPreview.name'),
  icon: ICONS.ScanEye,
  description: tFragment('settings.extensions.codeblockPreview.desc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [],
});
