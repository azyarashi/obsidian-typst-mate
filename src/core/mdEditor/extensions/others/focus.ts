import type { EditorHelper } from 'md@/index';
import { EditorView } from '@codemirror/view';

export const createFocusExtension = (helper: EditorHelper) => {
  return EditorView.updateListener.of(async (update) => {
    if (update.focusChanged && !update.view.hasFocus) helper.close();
  });
};
