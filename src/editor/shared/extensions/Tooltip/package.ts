import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const tooltipPackage = () =>
  ({
    id: 'tooltip',
    name: t('settings.extensions.tooltipName'),
    icon: ICONS.MessageSquare,
    description: t('settings.extensions.tooltipDesc'),
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
