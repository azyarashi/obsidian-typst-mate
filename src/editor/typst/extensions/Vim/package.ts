import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';

export const vimPackage = () =>
  ({
    id: 'vim',
    name: t('settings.extensions.vimName'),
    icon: ICONS.Vim,
    description: tFragment('settings.extensions.vimDesc'),
    tags: ['action'],
    scope: ['typst'],
    isBuiltin: false,
    defaultEnabled: false,
    settings: [],
  }) as const;
