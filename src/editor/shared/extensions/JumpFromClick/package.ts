import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const jumpFromClickPackage: ExtensionPackageFn = () =>
  ({
    id: 'jump-from-click',
    name: t('settings.extensions.jumpFromClick.name'),
    icon: ICONS.MousePointerClick,
    description: t('settings.extensions.jumpFromClick.desc'),
    tags: ['navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
