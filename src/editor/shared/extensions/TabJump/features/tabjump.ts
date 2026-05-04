import type { Facet } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { getActiveRegion, nextSnippetField, prevSnippetField } from '@/editor';
import { RenderingEngine } from '@/libs/processor';
import type { TabJumpSettings } from '../package';
import { jumpOutsideBracket, jumpOutsideRegion, jumpOutsideTypstMath } from './jumpHelpers';

export function executeTabJump(
  view: EditorView,
  direction: -1 | 1,
  tabJumpSettingsFacet: Facet<TabJumpSettings, TabJumpSettings>,
  onlyJumpToCursor: boolean = false,
): boolean {
  const settings = view.state.facet(tabJumpSettingsFacet);
  if (settings.revertTabToDefault) return false;

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

  return jumpOutsideRegion(view, region, cursor, targetContent, direction, settings);
}
