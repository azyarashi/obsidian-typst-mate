import type { Facet } from '@codemirror/state';
import { type EditorView, keymap } from '@codemirror/view';
import { RenderingEngine } from '@/libs/processor';
import { getActiveRegion, type ParsedRegion } from '../../utils/core';
import type { TabJumpSettings } from './package';
import {
  activateTabStopGroup,
  clearTabStopEffect,
  findMinTabStopGroup,
  findPrevTabStopGroup,
  TAB_STOP_REGEX,
  tabStopField,
} from './tabstop';

// ─── TabStop navigation ───────────────────────────────────────────────────────

/**
 * Find the bounds of the "snippet region" to search for TabStops.
 * We treat the entire active region content as the search space.
 */
function getSnippetSearchBounds(view: EditorView): { from: number; to: number } | null {
  const region = getActiveRegion(view);
  if (region) {
    return { from: region.from + region.skip, to: region.to };
  }
  // Fallback: search current line
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return { from: line.from, to: line.to };
}

/**
 * Navigate forward (Tab) through TabStop groups.
 * Returns true if a TabStop was found and activated.
 */
function jumpToNextTabStop(view: EditorView): boolean {
  const bounds = getSnippetSearchBounds(view);
  if (!bounds) return false;

  const state = view.state.field(tabStopField, false);
  const currentGroup = state?.activeGroup ?? null;
  const maxGroup = state?.maxGroup ?? 0;

  // Find next group number
  let targetGroup: number;
  if (currentGroup === null) {
    // No active session, look for minimum group
    const min = findMinTabStopGroup(view, bounds.from, bounds.to);
    if (min === -1) return false;
    targetGroup = min;
  } else {
    // Find the minimum group number > currentGroup
    const text = view.state.sliceDoc(bounds.from, bounds.to);
    const re = new RegExp(TAB_STOP_REGEX.source, 'g');
    let nextMin = Infinity;
    let m = re.exec(text);
    while (m !== null) {
      const n = parseInt(m[1]!, 10);
      if (n > currentGroup && n < nextMin) nextMin = n;
      m = re.exec(text);
    }
    if (!Number.isFinite(nextMin)) {
      // No more groups — clear state and fall through
      view.dispatch({ effects: clearTabStopEffect.of() });
      return false;
    }
    targetGroup = nextMin;
  }

  return activateTabStopGroup(view, targetGroup, bounds.from, bounds.to, maxGroup);
}

/**
 * Navigate backward (Shift-Tab) through TabStop groups.
 * Returns true if a TabStop was found and activated.
 */
function jumpToPrevTabStop(view: EditorView): boolean {
  const bounds = getSnippetSearchBounds(view);
  if (!bounds) return false;

  const state = view.state.field(tabStopField, false);
  const currentGroup = state?.activeGroup ?? null;

  if (currentGroup === null || currentGroup <= 0) return false;

  const prevGroup = findPrevTabStopGroup(view, bounds.from, bounds.to, currentGroup);
  if (prevGroup === -1) return false;

  const maxGroup = state?.maxGroup ?? 0;
  return activateTabStopGroup(view, prevGroup, bounds.from, bounds.to, maxGroup);
}

// ─── Original jump helpers (bracket / math / region) ─────────────────────────

function jumpOutsideBracket(
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
    const sanitizedContent = targetContent.replaceAll('\\)', '  ').replaceAll('\\', '  ').replaceAll('\\}', '  ');
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

function jumpOutsideTypstMath(
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

function jumpOutsideRegion(
  view: EditorView,
  region: ParsedRegion,
  cursor: number,
  content: string,
  direction: -1 | 1,
  settings: TabJumpSettings,
): boolean {
  const moveToEnd = settings.moveToEndBeforeExiting;
  const preferInlineExit = settings.preferInlineExitForSingleLineDisplayMath;

  if (region.kind === 'codeblock') {
    const insideTarget = direction === -1 ? region.from : region.to;
    if (moveToEnd && (direction === -1 ? insideTarget < cursor : cursor < insideTarget))
      view.dispatch({ selection: { anchor: insideTarget } });
    else {
      if (direction === -1) {
        const topOfBlock = view.state.doc.lineAt(region.from - 1).from;
        view.dispatch({ selection: { anchor: topOfBlock } });
      } else {
        const bottomOfBlock = view.state.doc.lineAt(region.to + 1).to;
        view.dispatch({ selection: { anchor: bottomOfBlock } });
      }
    }
    return true;
  }

  const delimiterLength = region.kind === 'inline' ? 1 : 2;
  const inside = direction === -1 ? region.from : region.to + region.skipEnd;

  if (moveToEnd && (direction === -1 ? inside < cursor : cursor < inside)) {
    view.dispatch({ selection: { anchor: inside - (direction === -1 ? 0 : region.skipEnd) } });
  } else {
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

  return true;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function executeTabJump(
  view: EditorView,
  direction: -1 | 1,
  tabJumpSettingsFacet: Facet<TabJumpSettings, TabJumpSettings>,
  onlyJumpToCursor: boolean = false,
): boolean {
  const settings = view.state.facet(tabJumpSettingsFacet);
  if (settings.revertTabToDefault) return false;

  // 1. Try TabStop navigation first
  if (direction === 1) {
    if (jumpToNextTabStop(view)) return true;
  } else {
    if (jumpToPrevTabStop(view)) return true;
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

// ─── Extension factory ────────────────────────────────────────────────────────

export function createTabJumpExtension(tabJumpSettingsFacet: Facet<TabJumpSettings, TabJumpSettings>) {
  return [
    tabStopField,
    keymap.of([
      {
        key: 'Tab',
        run: (view) => executeTabJump(view, 1, tabJumpSettingsFacet),
      },
      {
        key: 'Shift-Tab',
        run: (view) => executeTabJump(view, -1, tabJumpSettingsFacet),
      },
    ]),
  ];
}
