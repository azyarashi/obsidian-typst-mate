import type { EditorHelper } from 'md@/index';
import { StateField } from '@codemirror/state';
import type { EditorPosition } from 'obsidian';

export interface MathObject {
  kind: 'inline' | 'display';
  mode: null | 'at' | 'ac';

  content: string;
  startPos: EditorPosition; // $ 含まない
  endPos: EditorPosition; // $ 含まない
  startOffset: number;
  endOffset: number;
}

export const createMathStateExtension = (helper: EditorHelper) => {
  return StateField.define<MathObject | null>({
    create() {
      return null;
    },

    update(mathObject, tr) {
      const prevCursorPos = tr.startState.selection.main.head;
      const newCursorPos = tr.selection?.main.head;
      if (newCursorPos === undefined) return mathObject;

      if (!tr.docChanged) {
        if (prevCursorPos === newCursorPos) return mathObject;

        // カーソル移動
        if (mathObject === null) return helper.getMathObject(newCursorPos);
        if (mathObject.startOffset <= newCursorPos && newCursorPos <= mathObject.endOffset) return mathObject;
        return helper.getMathObject(newCursorPos);
      }

      // ドキュメント変更
      if (mathObject) {
        tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          if (mathObject!.startOffset <= fromA && toA <= mathObject!.endOffset) {
            mathObject!.content =
              mathObject!.content.slice(0, fromA - mathObject!.startOffset) +
              inserted.toString() +
              mathObject!.content.slice(toA - mathObject!.startOffset);
          }
        });

        mathObject!.endOffset = mathObject!.startOffset + mathObject!.content.length;
        mathObject!.endPos = helper.editor!.offsetToPos(mathObject!.endOffset);
      } else mathObject = helper.getMathObject(newCursorPos);
      return mathObject;
    },
  });
};
