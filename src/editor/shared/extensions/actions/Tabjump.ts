import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { EditorHelper } from '../../../index';
import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion, type ParsedRegion } from '../core/TypstMate';

export const tabJumpExtension = Prec.high(
  EditorView.domEventHandlers({
    keydown: (e, view) => {
      if (e.key !== 'Tab') return false;

      const helper = view.state.facet(editorHelperFacet);
      if (!helper) return false;

      const region = getActiveRegion(view);
      if (!region) return false;

      e.preventDefault();
      jumpCursor(view, helper, region, e.shiftKey ? 0 : 1);
      return true;
    },
  }),
);

function jumpCursor(view: EditorView, helper: EditorHelper, region: ParsedRegion, direction: 0 | 1) {
  const contentStart = region.from + region.skip;
  const contentEnd = region.to;
  const cursor = view.state.selection.main.head;
  const offset = cursor - contentStart;
  const content = view.state.sliceDoc(contentStart, contentEnd);

  if (offset <= 0 && direction === 0) return jumpOutside(view, contentStart, 0);
  if (offset >= content.length && direction === 1) return jumpOutside(view, contentEnd, 1);

  const targetContent = direction === 0 ? content.slice(0, offset) : content.slice(offset);

  if (jumpToCursor(view, contentStart, offset, targetContent, direction)) return;

  if (helper.plugin.settings.revertTabToDefault && direction === 1) return;
  jumpToBracket(view, contentStart, contentEnd, offset, targetContent, direction);
}

function jumpOutside(view: EditorView, boundary: number, direction: 0 | 1) {
  const checkPos = boundary + direction;
  const char = view.state.sliceDoc(checkPos, checkPos + 1);
  const nextChar = view.state.sliceDoc(checkPos + 1, checkPos + 2);

  let jumpDist = 1;
  if (char === '$') jumpDist = nextChar === '$' ? 2 : 1;
  else if (char === '`') {
    jumpDist = 3;
    if (view.state.sliceDoc(checkPos - 1, checkPos + 2) === '```') jumpDist = 4;
  }

  const target =
    direction === 0 ? Math.max(0, boundary - jumpDist) : Math.min(view.state.doc.length, boundary + jumpDist);

  view.dispatch({ selection: { anchor: target } });
}

function jumpToCursor(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: 0 | 1,
): boolean {
  const cursorStr = '#CURSOR';
  const cursorIndex = targetContent.indexOf(cursorStr);

  if (cursorIndex === -1) return false;

  const absPos = direction === 0 ? contentStart + cursorIndex : contentStart + offset + cursorIndex;
  view.dispatch({
    changes: { from: absPos, to: absPos + cursorStr.length, insert: '' },
    selection: { anchor: absPos },
  });
  return true;
}

function jumpToBracket(
  view: EditorView,
  contentStart: number,
  contentEnd: number,
  offset: number,
  targetContent: string,
  direction: 0 | 1,
) {
  if (direction === 0) {
    const targetIndex = Math.max(
      targetContent.lastIndexOf('('),
      targetContent.lastIndexOf('['),
      targetContent.lastIndexOf('{'),
    );
    view.dispatch({ selection: { anchor: targetIndex === -1 ? contentStart : contentStart + targetIndex } });
  } else {
    const indices = [targetContent.indexOf(')'), targetContent.indexOf(']'), targetContent.indexOf('}')].filter(
      (i) => i !== -1,
    );
    const targetIndex = indices.length > 0 ? Math.min(...indices) : -1;

    if (targetIndex === -1) view.dispatch({ selection: { anchor: contentEnd } });
    else view.dispatch({ selection: { anchor: contentStart + offset + targetIndex + 1 } });
  }
}
