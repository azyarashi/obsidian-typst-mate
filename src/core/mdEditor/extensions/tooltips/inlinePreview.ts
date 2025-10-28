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
      if (!mathObject) return closeInlinePreview(helper);
      if (mathObject.kind !== 'inline') return closeInlinePreview(helper);

      const position = helper.calculatePopupPosition(mathObject.startPos, mathObject.endPos) ?? value.position;
      if (!position) return closeInlinePreview(helper);

      helper.inlinePreviewEl.render(position, mathObject.content);
      return { position };
    },
  });
};

function closeInlinePreview(helper: EditorHelper) {
  helper.inlinePreviewEl.close();
  return { position: null };
}
