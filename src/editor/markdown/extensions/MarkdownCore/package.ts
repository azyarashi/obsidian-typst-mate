import { ICONS } from '@/constants/icons';
import type { ExtensionPackageFn } from '@/libs/extensionManager';
import { t } from '@/libs/i18n';

export const markdownCorePackage: ExtensionPackageFn = () => ({
  id: 'markdown-core',
  name: t('settings.extensions.markdownCore.name'),
  icon: ICONS.Markdown,
  tags: ['core'],
  scope: ['markdown'],
  isBuiltin: true,
  settings: [],
});
