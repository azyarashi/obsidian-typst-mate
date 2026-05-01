import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn } from '@/libs/extensionManager';

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
