import { ICONS } from '@/constants/icons';
import type { ExtensionPackageFn } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

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
