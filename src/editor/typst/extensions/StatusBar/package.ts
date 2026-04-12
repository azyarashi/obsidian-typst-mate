import { ICONS } from '@/constants/icons';

export const statusBarPackage = () =>
  ({
    id: 'status-bar',
    name: '',
    icon: ICONS.Info,
    description: '',
    tags: ['ui'],
    scope: ['typst'],
    isBuiltin: true,
    isHidden: true,
    settings: [],
  }) as const;
