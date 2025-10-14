import type { MathObject } from 'md@/extensions/others/math';
import type { EditorHelper } from 'md@/index';

import { keymap } from '@codemirror/view';
import type { Editor } from 'obsidian';

export const createTabJumpKeymap = (helper: EditorHelper, getMathObject: () => MathObject | null) => {
  return keymap.of([
    {
      key: 'Tab',
      run: () => {
        const mathObject = getMathObject();
        console.log('Tab', mathObject);

        if (helper.editor && mathObject) return jumpCursor(helper.editor, mathObject, 'forward');
        return false;
      },
    },
    {
      key: 'Shift-Tab',
      run: () => {
        const mathObject = getMathObject();
        console.log('Shift-Tab', mathObject);

        if (helper.editor && mathObject) return jumpCursor(helper.editor, mathObject, 'backward');
        return false;
      },
    },
  ]);
};

const jumpCursor = (editor: Editor, mathObject: MathObject, direction: 'backward' | 'forward'): boolean => {
  const pos = editor.getCursor();
  const offset = editor.posToOffset(pos) - mathObject.startOffset;

  let startOffset: number;
  let targetContent: string;
  if (direction === 'backward') {
    if (offset === 0) {
      const cursorPos = editor.offsetToPos(mathObject.startOffset - 2);
      editor.setCursor(cursorPos);
      return true;
    }
    // 前側
    startOffset = mathObject.startOffset;
    targetContent = mathObject.content.slice(0, offset);
  } else {
    if (offset === mathObject.content.length) {
      const cursorPos = editor.offsetToPos(mathObject.endOffset + 2);
      editor.setCursor(cursorPos);
      return true;
    }
    // 後側
    // ? 括弧の直前に Jump するので +1 が必要
    startOffset = mathObject.startOffset + offset + 1;
    targetContent = mathObject.content.slice(offset) + 1;
  }

  const cursorIndex = targetContent.indexOf('#CURSOR');
  if (cursorIndex !== -1) {
    // CURSOR Jump
    const cursorPos = editor.offsetToPos(startOffset + cursorIndex - 1);
    // ? こうしないとエラーが発生する
    editor.setSelection(cursorPos, {
      line: cursorPos.line,
      ch: cursorPos.ch + 7,
    });
    editor.replaceSelection('');
    return true;
  } else {
    // Bracket Jump
    let parenIndex: number, bracketIndex: number, braceIndex: number;

    if (direction === 'backward') {
      parenIndex = targetContent.lastIndexOf('(');
      bracketIndex = targetContent.lastIndexOf('[');
      braceIndex = targetContent.lastIndexOf('{');
    } else {
      parenIndex = targetContent.indexOf(')');
      bracketIndex = targetContent.indexOf(']');
      braceIndex = targetContent.indexOf('}');
      parenIndex = parenIndex === -1 ? Infinity : parenIndex;
      bracketIndex = bracketIndex === -1 ? Infinity : bracketIndex;
      braceIndex = braceIndex === -1 ? Infinity : braceIndex;
    }

    let targetIndex =
      direction === 'backward'
        ? Math.max(parenIndex, bracketIndex, braceIndex)
        : Math.min(parenIndex, bracketIndex, braceIndex);
    targetIndex = targetIndex === Infinity ? -1 : targetIndex;
    if (targetIndex === -1) {
      // Content Jump
      const cursorPos =
        direction === 'backward'
          ? editor.offsetToPos(mathObject.startOffset)
          : editor.offsetToPos(mathObject.endOffset);
      editor.setCursor(cursorPos);
      return true;
    }
    const cursorPos = editor.offsetToPos(startOffset + targetIndex);

    editor.setCursor(cursorPos);
    return true;
  }
};
