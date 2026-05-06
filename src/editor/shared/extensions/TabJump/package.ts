import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/libs/extensionManager';
import { t, tFragment } from '@/libs/i18n';

export const tabJumpPackage = () =>
  ({
    id: 'tab-jump',
    name: t('settings.extensions.tabJumpName'),
    icon: ICONS.None,
    description: tFragment('settings.extensions.tabJumpDesc'),
    tags: ['action', 'navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'revertTabToDefault',
        type: 'toggle',
        title: t('settings.extensions.tabJump.revertTabToDefaultName'),
        description: tFragment('settings.extensions.tabJump.revertTabToDefaultDesc'),
        defaultValue: false,
      },
      {
        key: 'jumpOutsideBracket',
        type: 'toggle',
        title: t('settings.extensions.tabJump.jumpOutsideBracketName'),
        description: tFragment('settings.extensions.tabJump.jumpOutsideBracketDesc'),
        defaultValue: true,
      },
      {
        key: 'preferInlineExitForSingleLineDisplayMath',
        type: 'toggle',
        title: t('settings.extensions.tabJump.preferInlineExitForSingleLineDisplayMathName'),
        description: tFragment('settings.extensions.tabJump.preferInlineExitForSingleLineDisplayMathDesc'),
        defaultValue: true,
      },
      {
        key: 'moveToEndBeforeExiting',
        type: 'toggle',
        title: t('settings.extensions.tabJump.moveToEndBeforeExitingName'),
        description: tFragment('settings.extensions.tabJump.moveToEndBeforeExitingDesc'),
        defaultValue: false,
      },
    ],
  }) as const satisfies ExtensionPackage;

export type TabJumpSettings = InferSettingsFromPackage<typeof tabJumpPackage>;

export const tabJumpSettingsFacet = Facet.define<TabJumpSettings, TabJumpSettings>({
  combine: (values) => values[0]!,
});
