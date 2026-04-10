/**
 * typst/extensions の ExtensionEntry 定義
 */

import { EditorState } from '@codemirror/state';
import { ICONS } from '@/constants/icons';
import { defineExtension, type ExtensionEntry } from '@/libs/extensionManager';

import { errorLensExtension } from './ErrorLens';
import { indentRainbowExtension } from './IndentRainbow';
import { jumpToPreviewExtension } from './JumpToPreview';
import { statusBarExtension } from './StatusBar';

// ---------------------------------------------------------------------------
// Typst Core
// ---------------------------------------------------------------------------

export const typstCoreEntry = defineExtension()({
  info: {
    id: 'typst-core',
    name: 'Typst Core',
    icon: ICONS.TypstFill,
    description: 'Typst エディターの構文解析コア。常に有効で無効化できません。',
    tags: ['core'],
    scope: ['typst'],
    isBuiltin: true,
    settings: [
      {
        key: 'tabSize',
        type: 'slider',
        title: 'Tab Size',
        description: 'タブやインデントの幅',
        defaultValue: 2,
        min: 2,
        max: 8,
        step: 2,
      },
    ] as const,
  },
  factory: (_context, settings) => {
    return [EditorState.tabSize.of(Number(settings.tabSize))];
  },
});

// ---------------------------------------------------------------------------
// ErrorLens
// ---------------------------------------------------------------------------

export const errorLensEntry = defineExtension()({
  info: {
    id: 'typst-error-lens',
    name: 'Error Lens',
    icon: ICONS.AlertTriangle,
    description: 'エラーをインラインで表示します',
    tags: ['ui', 'decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => errorLensExtension,
});

// ---------------------------------------------------------------------------
// IndentRainbow
// ---------------------------------------------------------------------------

export const indentRainbowEntry = defineExtension()({
  info: {
    id: 'typst-indent-rainbow',
    name: 'Indent Rainbow',
    icon: ICONS.Rainbow,
    description: 'インデントをカラフルに表示します',
    tags: ['decoration'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => indentRainbowExtension,
});

// ---------------------------------------------------------------------------
// JumpToPreview
// ---------------------------------------------------------------------------

export const jumpToPreviewEntry = defineExtension()({
  info: {
    id: 'typst-jump-to-preview',
    name: 'Jump to Preview',
    icon: ICONS.ExternalLink,
    description: 'エディターの位置からプレビューの対応箇所にジャンプします',
    tags: ['navigation'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => jumpToPreviewExtension,
});

// ---------------------------------------------------------------------------
// StatusBar
// ---------------------------------------------------------------------------

export const statusBarEntry = defineExtension()({
  info: {
    id: 'typst-status-bar',
    name: 'Status Bar',
    icon: ICONS.Activity,
    description: 'コンパイル状態をステータスバーに表示します',
    tags: ['ui'],
    scope: ['typst'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => statusBarExtension,
});

// ---------------------------------------------------------------------------
// All typst entries
// ---------------------------------------------------------------------------

export const typstExtensionEntries: ExtensionEntry<any>[] = [
  typstCoreEntry,
  errorLensEntry,
  indentRainbowEntry,
  jumpToPreviewEntry,
  statusBarEntry,
];
