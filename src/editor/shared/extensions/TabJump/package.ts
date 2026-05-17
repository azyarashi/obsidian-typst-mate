import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t, tFragment } from '@/libs/i18n';
import type { ExtensionPackage, InferSettingsFromPackage } from '@/managers/extensionManager';

export const tabJumpPackage = () =>
  ({
    id: 'tab-jump',
    name: t('settings.extensions.tabJump.name'),
    icon: ICONS.None,
    description: tFragment('settings.extensions.tabJump.desc'),
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
        title: t('settings.extensions.tabJump.preferInlineExitName'),
        description: tFragment('settings.extensions.tabJump.preferInlineExitDesc'),
        defaultValue: true,
      },
      {
        key: 'moveToEndBeforeExiting',
        type: 'toggle',
        title: t('settings.extensions.tabJump.moveToEndOfMathBlockName'),
        description: tFragment('settings.extensions.tabJump.moveToEndOfMathBlockDesc'),
        defaultValue: false,
      },
    ],
  }) as const satisfies ExtensionPackage;

export type TabJumpSettings = InferSettingsFromPackage<typeof tabJumpPackage>;

export const tabJumpSettingsFacet = Facet.define<TabJumpSettings, TabJumpSettings>({
  combine: (values) => values[0]!,
});
