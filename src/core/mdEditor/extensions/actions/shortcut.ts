import type { MathObject } from 'md@/extensions/others/math';
import type { EditorHelper } from 'md@/index';

import { keymap } from '@codemirror/view';
import type { Editor } from 'obsidian';

import SHORTCUTS_DATA, { type Shortcut } from '@/data/shortcuts.json';

const SHORTCUTS_KEYS = Object.keys(SHORTCUTS_DATA);

export const createShortcutKeymap = (helper: EditorHelper, getMathObject: () => MathObject | null) => {
  return keymap.of([
    ...SHORTCUTS_KEYS.map((key) => ({
      key,
      run: () => {
        if (!helper.editor) return false;
        if (!getMathObject()) return false;

        const data = SHORTCUTS_DATA[key as keyof typeof SHORTCUTS_DATA];
        if (!data) return false;

        return executeShortcut(helper.editor, data);
      },
    })),
  ]);
};

export const executeShortcut = (editor: Editor, shortcut: Shortcut): boolean => {
  const selections = editor.listSelections();
  if (selections.length >= 1) return false;
  const selectedText = editor.getSelection();
  if (selectedText === '') return false;

  editor.replaceSelection(shortcut.content.replaceAll('$1', selectedText));
  if (shortcut.offset) {
    const cursor = editor.getCursor();
    editor.setCursor({
      line: cursor.line,
      ch: cursor.ch + shortcut.offset,
    });
  }

  return true;
};
