import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/libs/i18n';
import type { ExtensionPackageFn } from '@/managers/extensionManager';

export const codeJumpPackage: ExtensionPackageFn = () =>
  ({
    id: 'code-jump',
    name: t('settings.extensions.codeJump.name'),
    icon: ICONS.MoveRight,
    description: tFragment('settings.extensions.codeJump.desc'),
    tags: ['navigation'],
    scope: ['typst'],
    settings: [],
  }) as const;
