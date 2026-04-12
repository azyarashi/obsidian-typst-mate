import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const symbolConcealPackage: ExtensionPackageFn = () =>
  ({
    id: 'symbol-conceal',
    name: t('settings.extensions.symbolConceal.name'),
    icon: ICONS.SquareFunction,
    description: t('settings.extensions.symbolConceal.desc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'revealDelay',
        type: 'slider',
        title: t('settings.extensions.symbolConceal.revealDelay.name'),
        description: t('settings.extensions.symbolConceal.revealDelay.desc'),
        defaultValue: 1000,
        min: 0,
        max: 5000,
        step: 100,
      },
    ],
  }) as const;

export type SymbolConcealSettings = InferSettingsFromPackage<typeof symbolConcealPackage>;

export const symbolConcealSettingsFacet = Facet.define<SymbolConcealSettings, SymbolConcealSettings>({
  combine: (values) => values[0]!,
});
