import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
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
      jumpCursor(view, helper, region, e.shiftKey ? -1 : 1);
      return true;
    },
  }),
);

function jumpCursor(view: EditorView, helper: EditorHelper, region: ParsedRegion, direction: -1 | 1) {
  const contentStart = region.from + region.skip;
  const contentEnd = region.to;
  const cursor = view.state.selection.main.head;
  const offset = cursor - contentStart;

  const content = view.state.sliceDoc(contentStart, contentEnd);
  const targetContent = direction === -1 ? content.slice(0, offset) : content.slice(offset);

  if (jumpToCursor(view, contentStart, offset, targetContent, direction)) return;
  if (
    helper.plugin.settings.jumpOutsideBracket &&
    jumpOutsideBracket(view, contentStart, offset, targetContent, direction)
  )
    return;
  if (jumpOutsideTypstMath(view, contentStart, offset, targetContent, direction)) return;

  jumpOutsideRegion(view, helper, region, cursor, targetContent, direction);
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

function jumpOutsideBracket(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: -1 | 1,
): boolean {
  // TODO: SyntaxKind ベースにする

  if (direction === -1) {
    targetContent = targetContent.replaceAll('\\(', '  ').replaceAll('\\[', '  ').replaceAll('\\{', '  ');

    const targetIndex = Math.max(
      targetContent.lastIndexOf('('),
      targetContent.lastIndexOf('['),
      targetContent.lastIndexOf('{'),
    );
    if (targetIndex === -1) return false;

    view.dispatch({ selection: { anchor: contentStart + targetIndex } });
  } else {
    targetContent = targetContent.replaceAll('\\)', '  ').replaceAll('\\', '  ').replaceAll('\\}', '  ');

    const indices = [targetContent.indexOf(')'), targetContent.indexOf(']'), targetContent.indexOf('}')].filter(
      (i) => i !== -1,
    );
    const targetIndex = indices.length > 0 ? Math.min(...indices) : -1;
    if (targetIndex === -1) return false;

    view.dispatch({ selection: { anchor: contentStart + offset + targetIndex + 1 } });
  }

  return true;
}

function jumpOutsideTypstMath(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: -1 | 1,
): boolean {
  // TODO: SyntaxKind ベースにする

  targetContent = targetContent.replaceAll('\\$', '  ');
  if (direction === -1) {
    const targetIndex = targetContent.lastIndexOf('$');
    if (targetIndex === -1) return false;

    view.dispatch({ selection: { anchor: contentStart + targetIndex } });
  } else {
    const targetIndex = targetContent.indexOf('$');
    if (targetIndex === -1) return false;

    view.dispatch({ selection: { anchor: contentStart + offset + targetIndex + 1 } });
  }

  return true;
}

function jumpOutsideRegion(
  view: EditorView,
  helper: EditorHelper,
  region: ParsedRegion,
  cursor: number,
  content: string,
  direction: -1 | 1,
) {
  const delimiterLength = region.kind === 'inline' ? 1 : region.kind === 'display' ? 2 : 3;
  const inside = direction === -1 ? region.from : region.to + region.skipEnd;

  if (
    helper.plugin.settings.moveToEndOfMathBlockBeforeExiting &&
    (direction === -1 ? inside < cursor : cursor < inside)
  ) {
    view.dispatch({ selection: { anchor: inside - (direction === -1 ? 0 : region.skipEnd) } });
  } else {
    view.dispatch({
      selection: {
        anchor: inside + direction * delimiterLength,
      },
    });

    if (region.kind === 'inline') return;
    if (
      helper.plugin.settings.preferInlineExitForSingleLineDisplayMath &&
      region.kind === 'display' &&
      !content.includes('\n')
    )
      return;

    view.dispatch({
      changes: {
        from: region.to + region.skipEnd + delimiterLength,
        to: region.to + region.skipEnd + delimiterLength,
        insert: '\n',
      },
      selection: { anchor: region.to + region.skipEnd + delimiterLength + 1 },
    });
  }
}
