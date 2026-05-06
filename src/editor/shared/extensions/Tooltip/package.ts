import { ICONS } from '@/constants/icons';
import type { ExtensionPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const tooltipPackage = () =>
  ({
    id: 'tooltip',
    name: t('settings.extensions.tooltip.name'),
    icon: ICONS.MessageSquare,
    description: tFragment('settings.extensions.tooltip.desc'),
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const satisfies ExtensionPackage;
