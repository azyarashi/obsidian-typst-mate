import { Prec } from '@codemirror/state';
import { type EditorView, keymap } from '@codemirror/view';
import { getActiveRegion, nextSnippetField, type ParsedRegion, prevSnippetField } from '@/editor';
import { RenderingEngine } from '@/libs/processor';

export function jumpOutsideBracket(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: -1 | 1,
): boolean {
  if (direction === -1) {
    const sanitizedContent = targetContent.replaceAll('\\(', '  ').replaceAll('\\[', '  ').replaceAll('\\{', '  ');
    const targetIndex = Math.max(
      sanitizedContent.lastIndexOf('('),
      sanitizedContent.lastIndexOf('['),
      sanitizedContent.lastIndexOf('{'),
    );
    if (targetIndex === -1) return false;
    view.dispatch({ selection: { anchor: contentStart + targetIndex } });
  } else {
    const sanitizedContent = targetContent.replaceAll('\\)', '  ').replaceAll('\\]', '  ').replaceAll('\\}', '  ');
    const indices = [
      sanitizedContent.indexOf(')'),
      sanitizedContent.indexOf(']'),
      sanitizedContent.indexOf('}'),
    ].filter((i) => i !== -1);
    const targetIndex = indices.length > 0 ? Math.min(...indices) : -1;
    if (targetIndex === -1) return false;
    view.dispatch({ selection: { anchor: contentStart + offset + targetIndex + 1 } });
  }
  return true;
}

export function jumpOutsideTypstMath(
  view: EditorView,
  contentStart: number,
  offset: number,
  targetContent: string,
  direction: -1 | 1,
): boolean {
  const sanitizedContent = targetContent.replaceAll('\\$', '  ');
  if (direction === -1) {
    const targetIndex = sanitizedContent.lastIndexOf('$');
    if (targetIndex === -1) return false;
    view.dispatch({ selection: { anchor: contentStart + targetIndex } });
  } else {
    const targetIndex = sanitizedContent.indexOf('$');
    if (targetIndex === -1) return false;
    view.dispatch({ selection: { anchor: contentStart + offset + targetIndex + 1 } });
  }
  return true;
}

export function jumpOutsideRegion(
  view: EditorView,
  region: ParsedRegion,
  cursor: number,
  content: string,
  direction: -1 | 1,
): boolean {
  const moveToEnd = false;
  const preferInlineExit = true;

  const innerFrom = region.from + region.skip;
  const innerTo = region.to;
  const innerPos = direction === -1 ? innerFrom : innerTo;
  const isCursorInside = direction === -1 ? innerFrom < cursor : cursor < innerTo;

  if (moveToEnd && isCursorInside) view.dispatch({ selection: { anchor: innerPos } });

  switch (region.kind) {
    case 'codeblock': {
      const outerPos = direction === -1 ? Math.max(innerFrom - 4, 0) : Math.min(innerTo + 5, content.length);
      // TODO 改行
      view.dispatch({ selection: { anchor: outerPos } });
      break;
    }
    default: {
      const delimiterLength = region.kind === 'inline' ? 1 : 2;
      const inside = direction === -1 ? region.from : region.to + region.skipEnd;

      view.dispatch({ selection: { anchor: inside + direction * delimiterLength } });

      if (region.kind === 'inline') return true;
      if (preferInlineExit && region.kind === 'display' && !content.includes('\n')) return true;

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

  return true;
}

export function executeTabJump(view: EditorView, direction: -1 | 1, onlyJumpToCursor: boolean = false): boolean {
  const settings = {
    revertTabToDefault: false,
    jumpOutsideBracket: true,
    preferInlineExitForSingleLineDisplayMath: true,
    moveToEndBeforeExiting: false,
  };

  // 1. Try Snippet field navigation first
  if (direction === 1) {
    if (nextSnippetField({ state: view.state, dispatch: view.dispatch.bind(view) })) return true;
  } else {
    if (prevSnippetField({ state: view.state, dispatch: view.dispatch.bind(view) })) return true;
  }

  // 2. Fall back to bracket / region jump
  const region = getActiveRegion(view);
  if (!region) return false;

  const contentStart = region.from + region.skip;
  const contentEnd = region.to;
  const cursor = view.state.selection.main.head;
  const offset = cursor - contentStart;

  const content = view.state.sliceDoc(contentStart, contentEnd);
  const targetContent = direction === -1 ? content.slice(0, offset) : content.slice(offset);

  if (onlyJumpToCursor) return false;

  if (
    settings.jumpOutsideBracket &&
    view.state.selection.ranges.length === 1 &&
    jumpOutsideBracket(view, contentStart, offset, targetContent, direction)
  )
    return true;

  if (region.processor?.renderingEngine !== RenderingEngine.MathJax) {
    if (jumpOutsideTypstMath(view, contentStart, offset, targetContent, direction)) return true;
  }

  return jumpOutsideRegion(view, region, cursor, targetContent, direction);
}

export const tabJumpExtension = [
  Prec.highest(
    keymap.of([
      {
        key: 'Tab',
        run: (view) => executeTabJump(view, 1),
      },
      {
        key: 'Shift-Tab',
        run: (view) => executeTabJump(view, -1),
      },
    ]),
  ),
];
