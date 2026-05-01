import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const typstCorePackage = () =>
  ({
    id: 'typst-core',
    name: t('settings.extensions.typstCoreName'),
    icon: ICONS.Settings,
    description: t('settings.extensions.typstCoreDesc'),
    tags: ['core'],
    scope: ['typst'],
    isBuiltin: true,
    settings: [],
  }) as const;
