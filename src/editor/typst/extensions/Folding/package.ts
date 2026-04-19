import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const foldingPackage = () =>
  ({
    id: 'folding',
    name: t('settings.extensions.folding.name'),
    icon: ICONS.Code,
    description: t('settings.extensions.folding.desc'),
    tags: ['decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
