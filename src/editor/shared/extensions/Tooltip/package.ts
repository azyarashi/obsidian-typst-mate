import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const tooltipPackage: ExtensionPackageFn = () =>
  ({
    id: 'tooltip',
    name: t('settings.extensions.tooltip.name'),
    icon: ICONS.MessageSquare,
    description: tFragment('settings.extensions.tooltip.desc'),
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
