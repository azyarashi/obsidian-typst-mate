import { ICONS } from '@/constants/icons';
import type { ExtensionPackageFn } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

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
