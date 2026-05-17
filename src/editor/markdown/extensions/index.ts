import type { ExtensionEntry } from '@/managers/extensionManager';
import { codeblockPreviewEntry } from './CodeBlockPreview';
import { debuggerEntry } from './Debugger';
import { inlineMathPreviewEntry } from './InlineMathPreview';
import { latexSuiteIntegrationEntry } from './LaTeXSuiteIntegration';
import { markdownCoreEntry } from './MarkdownCore';

export const markdownExtensionEntries: (() => ExtensionEntry<any>)[] = [
  markdownCoreEntry,

  latexSuiteIntegrationEntry,

  codeblockPreviewEntry,
  inlineMathPreviewEntry,

  debuggerEntry,
];
