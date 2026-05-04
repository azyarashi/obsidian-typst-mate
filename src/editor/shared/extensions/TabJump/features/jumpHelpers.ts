import type { EditorView } from '@codemirror/view';
import type { ParsedRegion } from '@/editor';
import type { TabJumpSettings } from '../package';

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
  settings: TabJumpSettings,
): boolean {
  const moveToEnd = settings.moveToEndBeforeExiting;
  const preferInlineExit = settings.preferInlineExitForSingleLineDisplayMath;

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
