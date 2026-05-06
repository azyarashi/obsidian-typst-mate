import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const formatterPackage = () =>
  ({
    id: 'formatter',
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
        title: t('settings.extensions.formatter.formatOnSaveName'),
        description: tFragment('settings.extensions.formatter.formatOnSaveDesc'),
        defaultValue: false,
      },
      {
        type: 'header',
        title: t('settings.extensions.formatter.typstyleHeader'),
      },
      {
        key: 'tabSpaces',
        type: 'slider',
        title: t('settings.extensions.formatter.tabSpacesName'),
        description: tFragment('settings.extensions.formatter.tabSpacesDesc'),
        defaultValue: 2,
        min: 0,
        max: 8,
        step: 1,
      },
      {
        key: 'maxWidth',
        type: 'slider',
        title: t('settings.extensions.formatter.maxWidthName'),
        description: tFragment('settings.extensions.formatter.maxWidthDesc'),
        defaultValue: 80,
        min: 40,
        max: 200,
        step: 1,
      },
      {
        key: 'blankLinesUpperBound',
        type: 'slider',
        title: t('settings.extensions.formatter.blankLinesUpperBoundName'),
        description: tFragment('settings.extensions.formatter.blankLinesUpperBoundDesc'),
        defaultValue: 2,
        min: 0,
        max: 5,
        step: 1,
      },
      {
        key: 'collapseMarkupSpaces',
        type: 'toggle',
        title: t('settings.extensions.formatter.collapseMarkupSpacesName'),
        description: tFragment('settings.extensions.formatter.collapseMarkupSpacesDesc'),
        defaultValue: false,
      },
      {
        key: 'reorderImportItems',
        type: 'toggle',
        title: t('settings.extensions.formatter.reorderImportItemsName'),
        description: tFragment('settings.extensions.formatter.reorderImportItemsDesc'),
        defaultValue: true,
      },
      {
        key: 'wrapText',
        type: 'toggle',
        title: t('settings.extensions.formatter.wrapTextName'),
        description: tFragment('settings.extensions.formatter.wrapTextDesc'),
        defaultValue: true,
      },
    ],
  }) as const satisfies ExtensionPackage;

export type FormatterSettings = InferSettingsFromPackage<typeof formatterPackage>;

export const formatterSettingsFacet = Facet.define<FormatterSettings, FormatterSettings>({
  combine: (values) => values[0]!,
});
