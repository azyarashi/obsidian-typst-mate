import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/libs/extensionManager';

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
