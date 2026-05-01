import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const linterPackage: ExtensionPackageFn = () =>
  ({
    id: 'linter',
    name: t('settings.extensions.linterName'),
    icon: ICONS.ShieldAlert,
    description: t('settings.extensions.linterDesc'),
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [],
  }) as const;
