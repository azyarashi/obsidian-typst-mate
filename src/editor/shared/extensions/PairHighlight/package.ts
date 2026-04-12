import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const pairHighlightPackage = () =>
  ({
    id: 'pair-highlight',
    name: t('settings.extensions.pairHighlight.name'),
    icon: ICONS.Braces,
    description: t('settings.extensions.pairHighlight.desc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
