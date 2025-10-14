import type { EditorHelper, Position } from 'md@/index';
import { StateField } from '@codemirror/state';
import type { MathObject } from '../others/math';

interface InlinePreviewState {
  position: Position | null;
}

export const createInlinePreviewExtension = (helper: EditorHelper, getMathObject: () => MathObject | null) => {
  return StateField.define<InlinePreviewState>({
    create() {
      return { position: null };
    },

    update(value, _tr) {
      const mathObject = getMathObject();
      if (!mathObject) return { position: null };
      if (mathObject.kind !== 'inline') return { position: null };

      const position = helper.calculatePopupPosition(mathObject.startPos, mathObject.endPos) ?? value.position;
      if (!position) return { position: null };

      helper.inlinePreviewEl.render(position, mathObject.content);
      return { position };
    },
  });
};
