import { Facet } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { t } from '@/i18n';
import type { InferSettingsFromPackage } from '@/libs/extensionManager';

export const tabJumpPackage = () =>
  ({
    id: 'tab-jump',
    name: t('settings.extensions.tabJump.name'),
    icon: ICONS.CornerDownRight,
    description: t('settings.extensions.tabJump.desc'),
    tags: ['action', 'navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'jumpKey',
        type: 'keymap',
        title: t('settings.extensions.tabJump'),
        description: 'Tab',
        defaultValue: 'Tab',
      },
      {
        key: 'revertTabToDefault',
        type: 'toggle',
        title: t('settings.extensions.tabJump.revertTabToDefault.name'),
        description: t('settings.extensions.tabJump.revertTabToDefault.desc'),
        defaultValue: false,
      },
      {
        key: 'jumpOutsideBracket',
        type: 'toggle',
        title: t('settings.extensions.tabJump.jumpOutsideBracket.name'),
        description: t('settings.extensions.tabJump.jumpOutsideBracket.desc'),
        defaultValue: true,
      },
      {
        key: 'preferInlineExitForSingleLineDisplayMath',
        type: 'toggle',
        title: t('settings.extensions.tabJump.preferInlineExit.name'),
        description: t('settings.extensions.tabJump.preferInlineExit.desc'),
        defaultValue: true,
      },
      {
        key: 'moveToEndBeforeExiting',
        type: 'toggle',
        title: t('settings.extensions.tabJump.moveToEndOfMathBlock.name'),
        description: t('settings.extensions.tabJump.moveToEndOfMathBlock.desc'),
        defaultValue: false,
      },
    ],
  }) as const;

export type TabJumpSettings = InferSettingsFromPackage<typeof tabJumpPackage>;

export const tabJumpSettingsFacet = Facet.define<TabJumpSettings, TabJumpSettings>({
  combine: (values) => values[0]!,
});
