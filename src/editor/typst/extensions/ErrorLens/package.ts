import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const errorLensPackage = () =>
  ({
    id: 'error-lens',
    name: t('settings.extensions.errorLensName'),
    icon: ICONS.TriangleAlert,
    description: t('settings.extensions.errorLensDesc'),
    tags: ['decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
