import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const typstMateActionsPackage: ExtensionPackageFn = () =>
  ({
    id: 'typstmate-actions',
    name: t('settings.extensions.typstMateActions.name'),
    icon: ICONS.Zap,
    description: tFragment('settings.extensions.typstMateActions.desc'),
    tags: ['core', 'action'],
    scope: ['markdown', 'typst'],
    isBuiltin: true,
    settings: [
      {
        key: 'longPressDuration',
        type: 'slider',
        title: t('settings.extensions.typstMateActions.longPressDurationName'),
        description: tFragment('settings.extensions.typstMateActions.longPressDurationDesc'),
        defaultValue: 200,
        min: 0,
        max: 1000,
        step: 50,
      },
    ],
  }) as const;

export type TypstMateActionsSettings = InferSettingsFromPackage<typeof typstMateActionsPackage>;
