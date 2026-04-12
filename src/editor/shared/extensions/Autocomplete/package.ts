import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const autocompletePackage: ExtensionPackageFn = () => ({
  id: 'autocomplete',
  name: t('settings.extensions.autocomplete.name'),
  icon: ICONS.Terminal,
  description: t('settings.extensions.autocomplete.desc'),
  tags: ['completion'],
  scope: ['markdown', 'typst'],
  isBuiltin: false,
  settings: [
    {
      key: 'complementWithUnicode',
      type: 'toggle',
      title: t('settings.extensions.autocomplete.complementSymbolWithUnicode.name'),
      description: tFragment('settings.extensions.autocomplete.complementSymbolWithUnicode.desc'),
      defaultValue: false,
    },
  ],
});
