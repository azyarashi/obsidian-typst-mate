import { ICONS } from '@/constants/icons';
import { t } from '@/libs/i18n';
import type { ExtensionPackageFn } from '@/managers/extensionManager';

export const markdownCorePackage: ExtensionPackageFn = () => ({
  id: 'markdown-core',
  name: t('settings.extensions.markdownCore.name'),
  icon: ICONS.Markdown,
  tags: ['core'],
  scope: ['markdown'],
  isBuiltin: true,
  settings: [],
});
