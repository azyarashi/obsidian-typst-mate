import type { ExtensionEntry } from '@/libs/extensionManager';
import { autocompleteEntry } from './Autocomplete/index';
import { formatterEntry } from './Formatter/index';
import { linterEntry } from './Linter/index';
import { pairHighlightEntry } from './PairHighlight/index';
import { previewJumpEntry } from './PreviewJump/index';
import { symbolConcealEntry } from './SymbolConceal';
import { syntaxHighlightEntry } from './SyntaxHighlight/index';
import { tabJumpEntry } from './TabJump/index';
import { tooltipEntry } from './Tooltip/index';
import { typstMateActionsEntry } from './TypstMateActions/index';

export * from './Autocomplete';
export * from './Formatter';
export * from './Linter';
export * from './PreviewJump';
export * from './SymbolConceal';
export * from './SyntaxHighlight';
export * from './TabJump';
export * from './Theme';

export const sharedExtensionEntries: (() => ExtensionEntry<any>)[] = [
  syntaxHighlightEntry,
  formatterEntry,
  linterEntry,
  symbolConcealEntry,

  autocompleteEntry,
  pairHighlightEntry,

  tabJumpEntry,
  previewJumpEntry,

  tooltipEntry,

  typstMateActionsEntry,
];
