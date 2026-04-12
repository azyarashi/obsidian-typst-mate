import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const inlinePreviewPackage: ExtensionPackageFn = () => ({
  id: 'inline-preview',
  name: t('settings.extensions.inlinePreview.name'),
  icon: ICONS.ScanEye,
  description: t('settings.extensions.inlinePreview.desc'),
  tags: ['ui'],
  scope: ['markdown'],
  isBuiltin: false,
  settings: [],
});
