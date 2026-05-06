import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const symbolConcealPackage = () =>
  ({
    id: 'symbol-conceal',
    name: t('settings.extensions.symbolConceal.name'),
    icon: ICONS.Pi,
    description: tFragment('settings.extensions.symbolConceal.desc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'revealDelay',
        type: 'slider',
        title: t('settings.extensions.symbolConceal.revealDelayName'),
        description: tFragment('settings.extensions.symbolConceal.revealDelayDesc'),
        defaultValue: 1000,
        min: 0,
        max: 5000,
        step: 100,
      },
    ],
  }) as const satisfies ExtensionPackage;

export type SymbolConcealSettings = InferSettingsFromPackage<typeof symbolConcealPackage>;

export const symbolConcealSettingsFacet = Facet.define<SymbolConcealSettings, SymbolConcealSettings>({
  combine: (values) => values[0]!,
});
