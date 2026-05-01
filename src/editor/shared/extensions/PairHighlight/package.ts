import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const pairHighlightPackage = () =>
  ({
    id: 'pair-highlight',
    name: t('settings.extensions.pairHighlightName'),
    icon: ICONS.Braces,
    description: t('settings.extensions.pairHighlightDesc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
