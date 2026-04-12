import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const typstCorePackage = () =>
  ({
    id: 'typst-core',
    name: t('settings.extensions.typstCore.name'),
    icon: ICONS.Settings,
    description: t('settings.extensions.typstCore.desc'),
    tags: ['core'],
    scope: ['typst'],
    isBuiltin: true,
    settings: [],
  }) as const;
