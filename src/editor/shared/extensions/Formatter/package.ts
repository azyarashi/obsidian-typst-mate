import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const formatterPackage: ExtensionPackageFn = () =>
  ({
    id: 'typst-formatter',
    name: t('settings.extensions.formatter.name'),
    icon: ICONS.Sticker,
    description: tFragment('settings.extensions.formatter.desc'),
    tags: ['action'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'formatOnSave',
        type: 'toggle',
        title: t('settings.extensions.formatter.formatOnSave.name'),
        description: t('settings.extensions.formatter.formatOnSave.desc'),
        defaultValue: false,
      },
      {
        type: 'header',
        title: t('settings.extensions.formatter.typstyleHeader'),
      },
      {
        key: 'tabSpaces',
        type: 'slider',
        title: t('settings.extensions.formatter.tabSpaces.name'),
        description: t('settings.extensions.formatter.tabSpaces.desc'),
        defaultValue: 2,
        min: 0,
        max: 8,
        step: 1,
      },
      {
        key: 'maxWidth',
        type: 'slider',
        title: t('settings.extensions.formatter.maxWidth.name'),
        description: t('settings.extensions.formatter.maxWidth.desc'),
        defaultValue: 80,
        min: 40,
        max: 200,
        step: 1,
      },
      {
        key: 'blankLinesUpperBound',
        type: 'slider',
        title: t('settings.extensions.formatter.blankLinesUpperBound.name'),
        description: t('settings.extensions.formatter.blankLinesUpperBound.desc'),
        defaultValue: 2,
        min: 0,
        max: 5,
        step: 1,
      },
      {
        key: 'collapseMarkupSpaces',
        type: 'toggle',
        title: t('settings.extensions.formatter.collapseMarkupSpaces.name'),
        description: t('settings.extensions.formatter.collapseMarkupSpaces.desc'),
        defaultValue: false,
      },
      {
        key: 'reorderImportItems',
        type: 'toggle',
        title: t('settings.extensions.formatter.reorderImportItems.name'),
        description: t('settings.extensions.formatter.reorderImportItems.desc'),
        defaultValue: true,
      },
      {
        key: 'wrapText',
        type: 'toggle',
        title: t('settings.extensions.formatter.wrapText.name'),
        description: t('settings.extensions.formatter.wrapText.desc'),
        defaultValue: true,
      },
    ],
  }) as const;

export type FormatterSettings = InferSettingsFromPackage<typeof formatterPackage>;

export const formatterSettingsFacet = Facet.define<FormatterSettings, FormatterSettings>({
  combine: (values) => values[0]!,
});
