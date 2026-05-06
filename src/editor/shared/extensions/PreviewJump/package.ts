import { ICONS } from '@/constants/icons';
import type { ExtensionPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const previewJumpPackage = () =>
  ({
    id: 'preview-jump',
    name: t('settings.extensions.previewJump.name'),
    icon: ICONS.MoveLeft,
    description: tFragment('settings.extensions.previewJump.desc'),
    tags: ['navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const satisfies ExtensionPackage;
