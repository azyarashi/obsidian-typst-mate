import { ICONS } from '@/constants/icons';
import type { ExtensionPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const linterPackage = () =>
  ({
    id: 'linter',
    name: t('settings.extensions.linter.name'),
    icon: ICONS.ShieldAlert,
    description: tFragment('settings.extensions.linter.desc'),
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [],
  }) as const satisfies ExtensionPackage;
