import type { ExtensionEntry } from '@/libs/extensionManager';
import { codeblockPreviewEntry } from './CodeBlockPreview';
import { debuggerEntry } from './Debugger';
import { inlinePreviewEntry } from './InlineMathPreview';
import { markdownCoreEntry } from './MarkdownCore';

export const markdownExtensionEntries: (() => ExtensionEntry<any>)[] = [
  markdownCoreEntry,
  codeblockPreviewEntry,
  inlinePreviewEntry,
  debuggerEntry,
];
