import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const markdownCorePackage: ExtensionPackageFn = () => ({
  id: 'markdown-core',
  name: t('settings.extensions.markdownCoreName'),
  icon: ICONS.Markdown,
  description: t('settings.extensions.markdownCoreDesc'),
  tags: ['core'],
  scope: ['markdown'],
  isBuiltin: true,
  settings: [],
});
