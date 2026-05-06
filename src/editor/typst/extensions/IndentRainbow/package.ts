import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/libs/i18n';

export const indentRainbowPackage = () =>
  ({
    id: 'indent-rainbow',
    name: t('settings.extensions.indentRainbow.name'),
    icon: ICONS.Rainbow,
    description: tFragment('settings.extensions.indentRainbow.desc'),
    tags: ['decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
