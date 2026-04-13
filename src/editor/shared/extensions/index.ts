import type { ExtensionEntry } from '@/libs/extensionManager';
import { autocompleteEntry } from './Autocomplete/index';
import { formatterEntry } from './Formatter/index';
import { jumpFromClickEntry } from './JumpFromClick/index';
import { linterEntry } from './Linter/index';
import { pairHighlightEntry } from './PairHighlight/index';
import { symbolConcealEntry } from './SymbolConceal';
import { syntaxHighlightEntry } from './SyntaxHighlight/index';
import { tabJumpEntry } from './TabJump/index';
import { tooltipEntry } from './Tooltip/index';
import { typstMateActionEntry } from './TypstMateAction/index';

export { formatterSettingsFacet } from './Formatter/package';
export { symbolConcealSettingsFacet } from './SymbolConceal/package';
export { tabJumpSettingsFacet } from './TabJump/package';

export const sharedExtensionEntries: (() => ExtensionEntry<any>)[] = [
  autocompleteEntry,
  syntaxHighlightEntry,
  linterEntry,
  symbolConcealEntry,
  pairHighlightEntry,
  tabJumpEntry,
  jumpFromClickEntry,
  tooltipEntry,
  typstMateActionEntry,
  formatterEntry,
];
