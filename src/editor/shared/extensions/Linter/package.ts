import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackage } from '@/libs/extensionManager';

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
