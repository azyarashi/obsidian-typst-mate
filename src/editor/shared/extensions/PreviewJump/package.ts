import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

export const previewJumpPackage: ExtensionPackageFn = () =>
  ({
    id: 'preview-jump',
    name: t('settings.extensions.previewJump.name'),
    icon: ICONS.MoveLeft,
    description: tFragment('settings.extensions.previewJump.desc'),
    tags: ['navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  }) as const;
