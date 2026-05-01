import { type Facet, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { executeTabJump } from './features/tabjump';
import type { TabJumpSettings } from './package';

export { executeTabJump };

export function createTabJumpExtension(tabJumpSettingsFacet: Facet<TabJumpSettings, TabJumpSettings>) {
  return [
    Prec.highest(
      keymap.of([
        {
          key: 'Tab',
          run: (view) => executeTabJump(view, 1, tabJumpSettingsFacet),
        },
        {
          key: 'Shift-Tab',
          run: (view) => executeTabJump(view, -1, tabJumpSettingsFacet),
        },
      ]),
    ),
  ];
}
