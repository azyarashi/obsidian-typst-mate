import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { InferSettingsFromPackage } from '@/libs/extensionManager';

export const syntaxHighlightPackage = () =>
  ({
    id: 'syntax-highlight',
    name: t('settings.extensions.syntaxHighlight.name'),
    icon: ICONS.Highlighter,
    description: t('settings.extensions.syntaxHighlight.desc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [
      {
        key: 'useObsidianTheme',
        type: 'toggle',
        title: t('settings.extensions.syntaxHighlight.useObsidianTheme.name'),
        description: t('settings.extensions.syntaxHighlight.useObsidianTheme.desc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type SyntaxHighlightSettings = InferSettingsFromPackage<typeof syntaxHighlightPackage>;
