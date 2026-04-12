import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const errorLensPackage = () =>
  ({
    id: 'error-lens',
    name: t('settings.extensions.errorLens.name'),
    icon: ICONS.Bug,
    description: t('settings.extensions.errorLens.desc'),
    tags: ['decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
