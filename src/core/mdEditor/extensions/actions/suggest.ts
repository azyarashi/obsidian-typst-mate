import type { MathObject } from 'md@/extensions/others/math';
import type { EditorHelper } from 'md@/index';

import { keymap } from '@codemirror/view';
import type { Editor } from 'obsidian';

export const createSuggestKeymap = (helper: EditorHelper, _getMathObject: () => MathObject | null) => {
  return keymap.of([
    /* select */
    {
      key: 'ArrowDown',
      run: () => {
        console.log('ArrowDown');
        return false;
      },
    },
    {
      key: 'ArrowUp',
      run: () => false,
    },
    /* complete */
    {
      key: 'Tab',
      run: () => false,
    },
    {
      key: 'ArrowRight',
      run: () => false,
    },
    /* execute */
    {
      key: 'Enter',
      run: () => false,
    },
  ]);
};
