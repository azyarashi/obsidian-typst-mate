import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { InferSettingsFromPackage } from '@/libs/extensionManager';

export const tabJumpPackage = () =>
  ({
    id: 'tab-jump',
    name: t('settings.extensions.tabJumpName'),
    icon: ICONS.CornerDownRight,
    description: t('settings.extensions.tabJumpDesc'),
    tags: ['action', 'navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'revertTabToDefault',
        type: 'toggle',
        title: t('settings.extensions.tabJumpRevertTabToDefaultName'),
        description: t('settings.extensions.tabJumpRevertTabToDefaultDesc'),
        defaultValue: false,
      },
      {
        key: 'jumpOutsideBracket',
        type: 'toggle',
        title: t('settings.extensions.tabJumpJumpOutsideBracketName'),
        description: t('settings.extensions.tabJumpJumpOutsideBracketDesc'),
        defaultValue: true,
      },
      {
        key: 'preferInlineExitForSingleLineDisplayMath',
        type: 'toggle',
        title: t('settings.extensions.tabJumpPreferInlineExitName'),
        description: t('settings.extensions.tabJumpPreferInlineExitDesc'),
        defaultValue: true,
      },
      {
        key: 'moveToEndBeforeExiting',
        type: 'toggle',
        title: t('settings.extensions.tabJumpMoveToEndOfMathBlockName'),
        description: t('settings.extensions.tabJumpMoveToEndOfMathBlockDesc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type TabJumpSettings = InferSettingsFromPackage<typeof tabJumpPackage>;

export const tabJumpSettingsFacet = Facet.define<TabJumpSettings, TabJumpSettings>({
  combine: (values) => values[0]!,
});
