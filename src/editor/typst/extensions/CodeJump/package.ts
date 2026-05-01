import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const codeJumpPackage = () =>
  ({
    id: 'code-jump',
    name: t('settings.extensions.codeJump.name'),
    icon: ICONS.MoveRight,
    description: t('settings.extensions.codeJump.desc'),
    tags: ['navigation'],
    scope: ['typst'],
    isBuiltin: true,
    settings: [],
  }) as const;
