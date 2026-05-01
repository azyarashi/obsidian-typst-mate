import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const formatterPackage: ExtensionPackageFn = () =>
  ({
    id: 'typst-formatter',
    name: t('settings.extensions.formatterName'),
    icon: ICONS.Sticker,
    description: tFragment('settings.extensions.formatterDesc'),
    tags: ['action'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'formatOnSave',
        type: 'toggle',
        title: t('settings.extensions.formatterFormatOnSaveName'),
        description: t('settings.extensions.formatterFormatOnSaveDesc'),
        defaultValue: false,
      },
      {
        type: 'header',
        title: t('settings.extensions.formatter.typstyleHeader'),
      },
      {
        key: 'tabSpaces',
        type: 'slider',
        title: t('settings.extensions.formatterTabSpacesName'),
        description: t('settings.extensions.formatterTabSpacesDesc'),
        defaultValue: 2,
        min: 0,
        max: 8,
        step: 1,
      },
      {
        key: 'maxWidth',
        type: 'slider',
        title: t('settings.extensions.formatterMaxWidthName'),
        description: t('settings.extensions.formatterMaxWidthDesc'),
        defaultValue: 80,
        min: 40,
        max: 200,
        step: 1,
      },
      {
        key: 'blankLinesUpperBound',
        type: 'slider',
        title: t('settings.extensions.formatterBlankLinesUpperBoundName'),
        description: t('settings.extensions.formatterBlankLinesUpperBoundDesc'),
        defaultValue: 2,
        min: 0,
        max: 5,
        step: 1,
      },
      {
        key: 'collapseMarkupSpaces',
        type: 'toggle',
        title: t('settings.extensions.formatterCollapseMarkupSpacesName'),
        description: t('settings.extensions.formatterCollapseMarkupSpacesDesc'),
        defaultValue: false,
      },
      {
        key: 'reorderImportItems',
        type: 'toggle',
        title: t('settings.extensions.formatterReorderImportItemsName'),
        description: t('settings.extensions.formatterReorderImportItemsDesc'),
        defaultValue: true,
      },
      {
        key: 'wrapText',
        type: 'toggle',
        title: t('settings.extensions.formatterWrapTextName'),
        description: t('settings.extensions.formatterWrapTextDesc'),
        defaultValue: true,
      },
    ],
  }) as const;

export type FormatterSettings = InferSettingsFromPackage<typeof formatterPackage>;

export const formatterSettingsFacet = Facet.define<FormatterSettings, FormatterSettings>({
  combine: (values) => values[0]!,
});
