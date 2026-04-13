import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const autocompletePackage: ExtensionPackageFn = () =>
  ({
    id: 'autocomplete',
    name: t('settings.extensions.autocomplete.name'),
    icon: ICONS.Terminal,
    description: t('settings.extensions.autocomplete.desc'),
    tags: ['completion'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'useUnicodeSymbols',
        type: 'toggle',
        title: t('settings.extensions.autocomplete.useUnicodeSymbols.name'),
        description: tFragment('settings.extensions.autocomplete.useUnicodeSymbols.desc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type AutocompleteSettings = InferSettingsFromPackage<typeof autocompletePackage>;

export const autocompleteSettingsFacet = Facet.define<AutocompleteSettings, AutocompleteSettings>({
  combine: (values) => values[0]!,
});
