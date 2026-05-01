import type { ExtensionEntry } from '@/libs/extensionManager';
import { codeJumpEntry } from './CodeJump';
import { errorLensEntry } from './ErrorLens';
import { indentRainbowEntry } from './IndentRainbow';
import { typstCoreEntry } from './TypstCore';
import { vimEntry } from './Vim';

export const typstExtensionEntries: (() => ExtensionEntry<any>)[] = [
  typstCoreEntry,
  errorLensEntry,

  indentRainbowEntry,
  codeJumpEntry,

  vimEntry,
];

