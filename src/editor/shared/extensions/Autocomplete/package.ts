import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const autocompletePackage: ExtensionPackageFn = () =>
  ({
    id: 'autocomplete',
    name: t('settings.extensions.autocompleteName'),
    icon: ICONS.Terminal,
    description: t('settings.extensions.autocompleteDesc'),
    tags: ['completion'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'useUnicodeSymbols',
        type: 'toggle',
        title: t('settings.extensions.autocompleteUseUnicodeSymbolsName'),
        description: tFragment('settings.extensions.autocompleteUseUnicodeSymbolsDesc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type AutocompleteSettings = InferSettingsFromPackage<typeof autocompletePackage>;

export const autocompleteSettingsFacet = Facet.define<AutocompleteSettings, AutocompleteSettings>({
  combine: (values) => values[0]!,
});
