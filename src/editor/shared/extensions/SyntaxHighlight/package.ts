import { ICONS } from '@/constants/icons';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const syntaxHighlightPackage = () =>
  ({
    id: 'syntax-highlight',
    name: t('settings.extensions.syntaxHighlight.name'),
    icon: ICONS.Highlighter,
    description: tFragment('settings.extensions.syntaxHighlight.desc'),
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [
      {
        key: 'useObsidianTheme',
        type: 'toggle',
        title: t('settings.extensions.syntaxHighlight.useObsidianThemeName'),
        description: tFragment('settings.extensions.syntaxHighlight.useObsidianThemeDesc'),
        defaultValue: false,
      },
    ],
  }) as const satisfies ExtensionPackage;

export type SyntaxHighlightSettings = InferSettingsFromPackage<typeof syntaxHighlightPackage>;
