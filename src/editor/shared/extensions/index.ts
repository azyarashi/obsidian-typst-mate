/**
 * shared/extensions の ExtensionEntry 定義
 */

import { lintGutter } from '@codemirror/lint';
import { Facet, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { ICONS } from '@/constants/icons';
import { typstTextViewTheme } from '@/editor/typst/extensions/Theme';
import { settingsManager } from '@/libs';
import { defineExtension, type ExtensionEntry } from '@/libs/extensionManager';
import { buildActionExtensions } from '../keymaps/index';

// ---------------------------------------------------------------------------
// 1. Facets & Settings Types (ロジックのインポートより前に定義)
// ---------------------------------------------------------------------------

// TabJump
export interface TabJumpSettings {
  jumpKey: string;
  jumpBackKey: string;
  revertTabToDefault: boolean;
  jumpOutsideBracket: boolean;
  preferInlineExitForSingleLineDisplayMath: boolean;
  moveToEndBeforeExiting: boolean;
}
export const tabJumpSettingsFacet = Facet.define<TabJumpSettings, TabJumpSettings>({
  combine: (values) => values[0]!,
});

// MathSymbolConceal
export interface MathSymbolConcealSettings {
  enabled: boolean;
  revealDelay: number;
  complementWithUnicode: boolean;
}
export const mathSymbolConcealSettingsFacet = Facet.define<MathSymbolConcealSettings, MathSymbolConcealSettings>({
  combine: (values) => values[0]!,
});

// Formatter
export interface FormatterSettings {
  tabSpaces: number;
  maxWidth: number;
  blankLinesUpperBound: number;
  collapseMarkupSpaces: boolean;
  reorderImportItems: boolean;
  wrapText: boolean;
  formatOnSave: boolean;
}
export const formatterSettingsFacet = Facet.define<FormatterSettings, FormatterSettings>({
  combine: (values) => values[0]!,
});

// SyntaxHighlight
export interface SyntaxHighlightSettings {
  useObsidianTheme: boolean;
}

// TypstMateAction
export interface TypstMateActionSettings {
  longPressDelayMs: number;
}

// ---------------------------------------------------------------------------
// 2. Logic Imports
// ---------------------------------------------------------------------------

import { autocompleteExtension } from './Autocomplete';
import { typstFormatterPlugin } from './Formatter';
import { jumpFromClickExtension } from './JumpFromClick';
import { linterExtension } from './Linter';
import { createMathSymbolConcealExtension } from './MathSymbolConceal';
import { pairHighlightExtension } from './PairHighlight';
import { typstSyntaxHighlighting } from './SyntaxHighlight';
import { executeTabJump } from './TabJump';
import { obsidianTheme, typstTheme } from './Theme';
import { hoverExtension } from './Tooltip';

// ---------------------------------------------------------------------------
// 3. Extension Entries
// ---------------------------------------------------------------------------

// MathSymbolConceal
export const mathSymbolConcealEntry = defineExtension<MathSymbolConcealSettings>()({
  info: {
    id: 'math-symbol-conceal',
    name: 'Math Symbol Conceal',
    icon: ICONS.SquareFunction,
    description: '数式内の記号をリカーシブに隠蔽し、リッチな記号として表示します',
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      {
        key: 'enabled',
        type: 'toggle',
        title: '有効',
        description: '数式内の記号をリッチに表示します',
        defaultValue: true,
      },
      {
        key: 'revealDelay',
        type: 'slider',
        title: 'Reveal Delay',
        description: '遅延(ms)',
        defaultValue: 1000,
        min: 0,
        max: 5000,
        step: 100,
      },
      {
        key: 'complementWithUnicode',
        type: 'toggle',
        title: 'Unicode 補完',
        description: 'Unicode 補完',
        defaultValue: false,
      },
    ] as const,
  },
  factory: (_context, settings) => [
    mathSymbolConcealSettingsFacet.of(settings),
    createMathSymbolConcealExtension(mathSymbolConcealSettingsFacet),
  ],
});

// TabJump
export const tabJumpEntry = defineExtension<TabJumpSettings>()({
  info: {
    id: 'tab-jump',
    name: 'Tab Jump',
    icon: ICONS.CornerDownRight,
    description: 'Tab キーでジャンプします',
    tags: ['action', 'navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [
      { key: 'jumpKey', type: 'keymap', title: 'ジャンプキー (次へ)', description: 'Tab', defaultValue: 'Tab' },
      {
        key: 'jumpBackKey',
        type: 'keymap',
        title: 'ジャンプキー (前へ)',
        description: 'Shift-Tab',
        defaultValue: 'Shift-Tab',
      },
      {
        key: 'revertTabToDefault',
        type: 'toggle',
        title: 'デフォルトに戻す',
        description: 'Tab動作復帰',
        defaultValue: false,
      },
      {
        key: 'jumpOutsideBracket',
        type: 'toggle',
        title: 'ブラケット外へジャンプ',
        description: 'ジャンプ',
        defaultValue: true,
      },
      {
        key: 'preferInlineExitForSingleLineDisplayMath',
        type: 'toggle',
        title: '1行終了',
        description: '終了',
        defaultValue: true,
      },
      { key: 'moveToEndBeforeExiting', type: 'toggle', title: '末尾移動', description: '移動', defaultValue: false },
    ] as const,
  },
  factory: (_context, settings) => [
    tabJumpSettingsFacet.of(settings),
    Prec.high(
      keymap.of([
        { key: 'Tab', run: (view) => executeTabJump(view, 1, tabJumpSettingsFacet) },
        { key: 'Shift-Tab', run: (view) => executeTabJump(view, -1, tabJumpSettingsFacet) },
      ]),
    ),
  ],
});

// Formatter
export const formatterEntry = defineExtension<FormatterSettings>()({
  info: {
    id: 'typst-formatter',
    name: 'Formatter',
    icon: ICONS.AlignLeft,
    description: 'Typst フォーマッター',
    tags: ['action'],
    scope: ['typst', 'markdown'],
    isBuiltin: false,
    settings: [
      {
        key: 'tabSpaces',
        type: 'slider',
        title: 'Tab Spaces',
        description: 'スペース',
        defaultValue: 2,
        min: 0,
        max: 8,
        step: 1,
      },
      {
        key: 'maxWidth',
        type: 'slider',
        title: 'Max Width',
        description: '幅',
        defaultValue: 80,
        min: 40,
        max: 200,
        step: 1,
      },
      {
        key: 'blankLinesUpperBound',
        type: 'slider',
        title: 'Blank Lines',
        description: '空行',
        defaultValue: 2,
        min: 0,
        max: 5,
        step: 1,
      },
      { key: 'collapseMarkupSpaces', type: 'toggle', title: 'Collapse', description: '結合', defaultValue: false },
      { key: 'reorderImportItems', type: 'toggle', title: 'Reorder', description: 'ソート', defaultValue: true },
      { key: 'wrapText', type: 'toggle', title: 'Wrap', description: '折り返し', defaultValue: true },
      { key: 'formatOnSave', type: 'toggle', title: 'Format on Save', description: '保存時', defaultValue: false },
    ] as const,
  },
  factory: (_context, settings) => [formatterSettingsFacet.of(settings), typstFormatterPlugin],
});

// SyntaxHighlight
export const syntaxHighlightEntry = defineExtension<SyntaxHighlightSettings>()({
  info: {
    id: 'syntax-highlight',
    name: 'Syntax Highlight',
    icon: ICONS.Highlighter,
    description: 'ハイライト',
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [
      { key: 'useObsidianTheme', type: 'toggle', title: 'Obsidian テーマ', description: 'テーマ', defaultValue: false },
    ] as const,
  },
  factory: (context, settings) => {
    const baseTheme = settings.useObsidianTheme ? obsidianTheme : typstTheme;
    const highlighting = typstSyntaxHighlighting();
    const ext = context === 'typst' ? [highlighting, baseTheme, typstTextViewTheme] : [highlighting, baseTheme];
    return context === 'markdown' ? Prec.low(ext) : ext;
  },
});

// TypstMateAction
export const typstMateActionEntry = defineExtension<TypstMateActionSettings>()({
  info: {
    id: 'typst-mate-action',
    name: 'Typst Mate Action',
    icon: ICONS.Zap,
    description: 'Actions',
    tags: ['core', 'action'],
    scope: ['markdown', 'typst'],
    isBuiltin: true,
    settings: [
      {
        key: 'longPressDelayMs',
        type: 'slider',
        title: 'Delay',
        description: 'Delay',
        defaultValue: 200,
        min: 0,
        max: 1000,
        step: 50,
      },
    ] as const,
  },
  factory: (_context, settings) => buildActionExtensions(settingsManager.settings.actions, settings.longPressDelayMs),
});

export const pairHighlightEntry = defineExtension()({
  info: {
    id: 'pair-highlight',
    name: 'Bracket Pair',
    icon: ICONS.Braces,
    description: 'Highlight',
    tags: ['decoration'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: () => pairHighlightExtension,
});

export const jumpFromClickEntry = defineExtension()({
  info: {
    id: 'jump-from-click',
    name: 'Jump',
    icon: ICONS.MousePointerClick,
    description: 'Jump',
    tags: ['navigation'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: () => jumpFromClickExtension,
});

export const linterEntry = defineExtension()({
  info: {
    id: 'linter',
    name: 'Linter',
    icon: ICONS.ShieldAlert,
    description: 'Linter',
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    displayOrder: 50,
    settings: [],
  },
  factory: (context) => (context === 'typst' ? [linterExtension, lintGutter()] : linterExtension),
});

export const autocompleteEntry = defineExtension()({
  info: {
    id: 'autocomplete',
    name: 'Autocomplete',
    icon: ICONS.TextCursorInput,
    description: 'Autocomplete',
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: () => autocompleteExtension,
});

export const tooltipEntry = defineExtension()({
  info: {
    id: 'tooltip',
    name: 'Tooltip',
    icon: ICONS.MessageSquare,
    description: 'Tooltip',
    tags: ['ui'],
    scope: ['markdown', 'typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: () => hoverExtension,
});

export const sharedExtensionEntries: ExtensionEntry<any>[] = [
  syntaxHighlightEntry,
  linterEntry,
  mathSymbolConcealEntry,
  pairHighlightEntry,
  tabJumpEntry,
  jumpFromClickEntry,
  autocompleteEntry,
  tooltipEntry,
  typstMateActionEntry,
  formatterEntry,
];
