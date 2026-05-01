import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { InferSettingsFromPackage } from '@/libs/extensionManager';

export const typstMateActionPackage = () =>
  ({
    id: 'typstmate-action',
    name: t('settings.extensions.typstMateActionName'),
    icon: ICONS.Zap,
    description: t('settings.extensions.typstMateActionDesc'),
    tags: ['core', 'action'],
    scope: ['markdown', 'typst'],
    isBuiltin: true,
    settings: [
      {
        key: 'longPressDuration',
        type: 'slider',
        title: t('settings.extensions.typstMateActionLongPressDurationName'),
        description: t('settings.extensions.typstMateActionLongPressDurationDesc'),
        defaultValue: 200,
        min: 0,
        max: 1000,
        step: 50,
      },
    ],
  }) as const;

export type TypstMateActionSettings = InferSettingsFromPackage<typeof typstMateActionPackage>;
