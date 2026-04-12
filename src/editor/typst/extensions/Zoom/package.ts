import { ICONS } from '@/constants';

export const zoomPackage = () =>
  ({
    id: 'zoom',
    name: '',
    icon: ICONS.None,
    description: '',
    tags: ['ui'],
    scope: ['typst'],
    isBuiltin: true,
    isHidden: true,
    settings: [],
  }) as const;
