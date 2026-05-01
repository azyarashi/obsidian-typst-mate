import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { InferSettingsFromPackage } from '@/libs/extensionManager';

export const syntaxHighlightPackage = () =>
  ({
    id: 'syntax-highlight',
    name: t('settings.extensions.syntaxHighlightName'),
    icon: ICONS.Highlighter,
    description: t('settings.extensions.syntaxHighlightDesc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [
      {
        key: 'useObsidianTheme',
        type: 'toggle',
        title: t('settings.extensions.syntaxHighlightUseObsidianThemeName'),
        description: t('settings.extensions.syntaxHighlightUseObsidianThemeDesc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type SyntaxHighlightSettings = InferSettingsFromPackage<typeof syntaxHighlightPackage>;
