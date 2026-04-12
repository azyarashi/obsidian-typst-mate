import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';

export const jumpToPreviewPackage = () =>
  ({
    id: 'jump-to-preview',
    name: t('settings.extensions.jumpToPreview.name'),
    icon: ICONS.ExternalLink,
    description: t('settings.extensions.jumpToPreview.desc'),
    tags: ['navigation'],
    scope: ['typst'],
    isBuiltin: true,
    settings: [],
  }) as const;
