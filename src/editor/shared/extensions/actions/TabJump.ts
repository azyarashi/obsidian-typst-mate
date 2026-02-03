import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { EditorHelper } from '../../../index';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion, typstMateCore } from '../core/TypstMate';

export const tabJumpExtension = Prec.high(
  EditorView.domEventHandlers({
    keydown: (e, view) => {
      const helper = view.state.facet(editorHelperFacet);
      if (!helper) return;

      if (e.key === 'Tab') {
        jumpCursor(view, helper, e.shiftKey ? 'backward' : 'forward', () => e.preventDefault());
      }
    },
  }),
);

const jumpCursor = (
  view: EditorView,
  helper: EditorHelper,
  direction: 'backward' | 'forward',
  preventDefault: () => void,
) => {
  const region = getActiveRegion(view);
  if (!region) return;

  const offset = view.state.selection.main.head - region.from;
  const content = view.state.sliceDoc(region.from, region.to);

  if (direction === 'backward' && !helper.plugin.settings.revertTabToDefault) {
    if (offset === 0) {
      // Jump out backward
      const prevChar = view.state.sliceDoc(region.from - 1, region.from);
      const prevPrevChar = view.state.sliceDoc(region.from - 2, region.from - 1);

      let jumpDist = 0;
      if (prevChar === '$') {
        jumpDist = prevPrevChar === '$' ? 2 : 1;
      } else if (prevChar === '`') {
        jumpDist = 3;
        if (view.state.sliceDoc(region.from - 4, region.from - 1) === '```') jumpDist = 4;
      }

      if (jumpDist === 0) jumpDist = 1;

      preventDefault();
      view.dispatch({ selection: { anchor: Math.max(0, region.from - jumpDist) } });
      return;
    }

    const startOffset = region.from;
    const targetContent = content.slice(0, offset);

    const cursorStr = '#CURSOR';
    const cursorIndex = targetContent.indexOf(cursorStr);

    if (cursorIndex !== -1) {
      preventDefault();
      const absPos = startOffset + cursorIndex;
      view.dispatch({
        changes: { from: absPos, to: absPos + cursorStr.length, insert: '' },
        selection: { anchor: absPos },
      });
      return;
    }

    const parenIndex = targetContent.lastIndexOf('(');
    const bracketIndex = targetContent.lastIndexOf('[');
    const braceIndex = targetContent.lastIndexOf('{');

    const targetIndex = Math.max(parenIndex, bracketIndex, braceIndex);

    if (targetIndex === -1) {
      preventDefault();
      view.dispatch({ selection: { anchor: region.from } });
      return;
    }

    preventDefault();
    view.dispatch({ selection: { anchor: startOffset + targetIndex } });
  } else if (direction === 'forward') {
    if (offset === content.length) {
      // Jump out forward
      const nextChar = view.state.sliceDoc(region.to, region.to + 1);
      const nextNextChar = view.state.sliceDoc(region.to + 1, region.to + 2);

      let jumpDist = 0;
      if (nextChar === '$') {
        jumpDist = nextNextChar === '$' ? 2 : 1;
      } else if (nextChar === '`') {
        jumpDist = 3;
      }
      if (jumpDist === 0) jumpDist = 1;

      preventDefault();
      view.dispatch({ selection: { anchor: Math.min(view.state.doc.length, region.to + jumpDist) } });
      return;
    }

    // const startOffset = region.from;

    const targetContent = content.slice(offset);

    const cursorStr = '#CURSOR';
    const cursorIndex = targetContent.indexOf(cursorStr);

    if (cursorIndex !== -1) {
      preventDefault();
      const absPos = region.from + offset + cursorIndex;
      view.dispatch({
        changes: { from: absPos, to: absPos + cursorStr.length, insert: '' },
        selection: { anchor: absPos },
      });
      return;
    }

    if (!helper.plugin.settings.revertTabToDefault) {
      let parenIndex = targetContent.indexOf(')');
      let bracketIndex = targetContent.indexOf(']');
      let braceIndex = targetContent.indexOf('}');

      parenIndex = parenIndex === -1 ? Infinity : parenIndex;
      bracketIndex = bracketIndex === -1 ? Infinity : bracketIndex;
      braceIndex = braceIndex === -1 ? Infinity : braceIndex;

      const targetIndex = Math.min(parenIndex, bracketIndex, braceIndex);

      if (targetIndex === Infinity) {
        preventDefault();
        view.dispatch({ selection: { anchor: region.to } });
        return;
      }

      preventDefault();
      // Jump over the bracket
      view.dispatch({ selection: { anchor: region.from + offset + targetIndex + 1 } });
    }
  }
};
