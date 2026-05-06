import { ICONS } from '@/constants/icons';
import type { ExtensionPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const pairHighlightPackage = () =>
  ({
    id: 'pair-highlight',
    name: t('settings.extensions.pairHighlight.name'),
    icon: ICONS.Braces,
    description: tFragment('settings.extensions.pairHighlight.desc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const satisfies ExtensionPackage;
