import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const autocompletePackage = () =>
  ({
    id: 'autocomplete',
    name: t('settings.extensions.autocomplete.name'),
    icon: ICONS.Terminal,
    description: tFragment('settings.extensions.autocomplete.desc'),
    tags: ['completion'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'useUnicodeSymbols',
        type: 'toggle',
        title: t('settings.extensions.autocomplete.useUnicodeSymbolsName'),
        description: tFragment('settings.extensions.autocomplete.useUnicodeSymbolsDesc'),
        defaultValue: false,
      },
    ],
  }) as const satisfies ExtensionPackage;

export type AutocompleteSettings = InferSettingsFromPackage<typeof autocompletePackage>;

export const autocompleteSettingsFacet = Facet.define<AutocompleteSettings, AutocompleteSettings>({
  combine: (values) => values[0]!,
});
