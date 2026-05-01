import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';

export const vimPackage = () =>
  ({
    id: 'vim',
    name: t('settings.extensions.vim.name'),
    icon: ICONS.Vim,
    description: tFragment('settings.extensions.vim.desc'),
    tags: ['action'],
    scope: ['typst'],
    defaultEnabled: false,
    settings: [],
  }) as const;
