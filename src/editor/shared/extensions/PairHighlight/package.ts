import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackage } from '@/libs/extensionManager';

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
