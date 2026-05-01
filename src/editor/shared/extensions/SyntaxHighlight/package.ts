import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const syntaxHighlightPackage: ExtensionPackageFn = () =>
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
  }) as const;

export type SyntaxHighlightSettings = InferSettingsFromPackage<typeof syntaxHighlightPackage>;
