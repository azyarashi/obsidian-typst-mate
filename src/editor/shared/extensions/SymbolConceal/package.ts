import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const symbolConcealPackage: ExtensionPackageFn = () =>
  ({
    id: 'symbol-conceal',
    name: t('settings.extensions.symbolConcealName'),
    icon: ICONS.Pi,
    description: t('settings.extensions.symbolConcealDesc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'revealDelay',
        type: 'slider',
        title: t('settings.extensions.symbolConcealRevealDelayName'),
        description: t('settings.extensions.symbolConcealRevealDelayDesc'),
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
