import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const indentRainbowPackage = () =>
  ({
    id: 'indent-rainbow',
    name: t('settings.extensions.indentRainbowName'),
    icon: ICONS.Rainbow,
    description: t('settings.extensions.indentRainbowDesc'),
    tags: ['decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
