import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { editorHelperFacet } from '../core/Helper';
import { getActiveRegion, type ParsedRegion } from '../core/TypstMate';

const cursorStr = '#CURSOR';

export const tabJumpExtension = Prec.high(
  EditorView.domEventHandlers({
    keydown: (e, view) => {
      if (e.key !== 'Tab') return false;

      const helper = view.state.facet(editorHelperFacet);
      if (!helper || helper.plugin.settings.revertTabToDefault) return false;

      const region = getActiveRegion(view);
      if (!region) return false;

      e.preventDefault();
      jumpCursor(view, region, e.shiftKey ? -1 : 1);
      return true;
    },
  }),
);

function jumpCursor(view: EditorView, region: ParsedRegion, direction: -1 | 1) {
  const contentStart = region.from + region.skip;
  const contentEnd = region.to;
  const cursor = view.state.selection.main.head;
  const offset = cursor - contentStart;

  const content = view.state.sliceDoc(contentStart, contentEnd);
  const targetContent = direction === -1 ? content.slice(0, offset) : content.slice(offset);

  if (jumpToCursor(view, contentStart, offset, targetContent, direction)) return;
  if (jumpToBracket(view, contentStart, offset, targetContent, direction)) return;

  jumpOutside(view, region, direction);
}

function jumpToCursor(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: -1 | 1,
): boolean {
  const cursorIndex = targetContent.indexOf(cursorStr);
  if (cursorIndex === -1) return false;

  const absPos = direction === -1 ? contentStart + cursorIndex : contentStart + offset + cursorIndex;
  view.dispatch({
    changes: { from: absPos, to: absPos + cursorStr.length, insert: '' },
    selection: { anchor: absPos },
  });
  return true;
}

function jumpToBracket(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: -1 | 1,
): boolean {
  if (direction === -1) {
    const targetIndex = Math.max(
      targetContent.lastIndexOf('('),
      targetContent.lastIndexOf('['),
      targetContent.lastIndexOf('{'),
    );
    if (targetIndex === -1) return false;

    view.dispatch({ selection: { anchor: contentStart + targetIndex } });
  } else {
    const indices = [targetContent.indexOf(')'), targetContent.indexOf(']'), targetContent.indexOf('}')].filter(
      (i) => i !== -1,
    );
    const targetIndex = indices.length > 0 ? Math.min(...indices) : -1;
    if (targetIndex === -1) return false;

    view.dispatch({ selection: { anchor: contentStart + offset + targetIndex + 1 } });
  }

  return true;
}

function jumpOutside(view: EditorView, region: ParsedRegion, direction: -1 | 1) {
  view.dispatch({
    selection: {
      anchor:
        (direction === -1 ? region.from : region.to + region.skipEnd) +
        direction * (region.kind === 'inline' ? 1 : region.kind === 'display' ? 2 : 3),
    },
  });
}
