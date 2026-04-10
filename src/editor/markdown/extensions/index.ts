import { ICONS } from '@/constants/icons';
import { defineExtension, type ExtensionEntry } from '@/libs/extensionManager';
import { codeblockPreviewExtension } from './CodeBlockPreview';
import { debuggerExtension } from './Debugger';
import { inlinePreviewExtension } from './InlineMathPreview';

export const markdownCoreEntry = defineExtension()({
  info: {
    id: 'markdown-core',
    name: 'Markdown Core',
    icon: ICONS.Settings,
    description: 'Markdownエディターの基本機能',
    tags: ['core'],
    scope: ['markdown'],
    isBuiltin: true,
    settings: [],
  },
  factory: (_context, _settings) => [],
});

export const codeblockPreviewEntry = defineExtension()({
  info: {
    id: 'codeblock-preview',
    name: 'Codeblock Preview',
    icon: ICONS.Code,
    description: 'Typstコードブロックをレンダリングします',
    tags: ['ui'],
    scope: ['markdown'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => codeblockPreviewExtension,
});

export const inlinePreviewEntry = defineExtension()({
  info: {
    id: 'inline-preview',
    name: 'Inline Preview',
    icon: ICONS.Activity,
    description: 'インライン数式をレンダリングします',
    tags: ['ui'],
    scope: ['markdown'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => inlinePreviewExtension,
});

export const debuggerEntry = defineExtension()({
  info: {
    id: 'debugger',
    name: 'Debugger',
    icon: ICONS.Bug,
    description: 'デバッガーを表示して開発に役立てます',
    tags: ['ui'],
    scope: ['markdown'],
    isBuiltin: false,
    settings: [],
  },
  factory: (_context, _settings) => debuggerExtension,
});

export const markdownExtensionEntries: ExtensionEntry<any>[] = [
  markdownCoreEntry,
  codeblockPreviewEntry,
  inlinePreviewEntry,
  debuggerEntry,
];
