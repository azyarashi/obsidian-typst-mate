import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { InferSettingsFromPackage } from '@/libs/extensionManager';

export const typstMateActionPackage = () =>
  ({
    id: 'typst-mate-action',
    name: t('settings.extensions.typstMateAction.name'),
    icon: ICONS.Zap,
    description: t('settings.extensions.typstMateAction.desc'),
    tags: ['core', 'action'],
    scope: ['markdown', 'typst'],
    isBuiltin: true,
    settings: [
      {
        key: 'longPressDelayMs',
        type: 'slider',
        title: t('settings.extensions.typstMateAction.longPressDelayMs.name'),
        description: t('settings.extensions.typstMateAction.longPressDelayMs.desc'),
        defaultValue: 200,
        min: 0,
        max: 1000,
        step: 50,
      },
    ],
  }) as const;

export type TypstMateActionSettings = InferSettingsFromPackage<typeof typstMateActionPackage>;
