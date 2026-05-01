import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/i18n';
import type { ExtensionPackageFn, InferSettingsFromPackage } from '@/libs/extensionManager';

export const tabJumpPackage: ExtensionPackageFn = () =>
  ({
    id: 'tab-jump',
    name: t('settings.extensions.tabJumpName'),
    icon: ICONS.CornerDownRight,
    description: tFragment('settings.extensions.tabJumpDesc'),
    tags: ['action', 'navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'revertTabToDefault',
        type: 'toggle',
        title: t('settings.extensions.tabJump.revertTabToDefaultName'),
        description: t('settings.extensions.tabJump.revertTabToDefaultDesc'),
        defaultValue: false,
      },
      {
        key: 'jumpOutsideBracket',
        type: 'toggle',
        title: t('settings.extensions.tabJump.jumpOutsideBracketName'),
        description: t('settings.extensions.tabJump.jumpOutsideBracketDesc'),
        defaultValue: true,
      },
      {
        key: 'preferInlineExitForSingleLineDisplayMath',
        type: 'toggle',
        title: t('settings.extensions.tabJump.preferInlineExitForSingleLineDisplayMathName'),
        description: t('settings.extensions.tabJump.preferInlineExitForSingleLineDisplayMathDesc'),
        defaultValue: true,
      },
      {
        key: 'moveToEndBeforeExiting',
        type: 'toggle',
        title: t('settings.extensions.tabJump.moveToEndBeforeExitingName'),
        description: t('settings.extensions.tabJump.moveToEndBeforeExitingDesc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type TabJumpSettings = InferSettingsFromPackage<typeof tabJumpPackage>;

export const tabJumpSettingsFacet = Facet.define<TabJumpSettings, TabJumpSettings>({
  combine: (values) => values[0]!,
});
