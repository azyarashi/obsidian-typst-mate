import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { clearTabStopEffect, setTabStopEffect, tabStopField } from '../state';
import { getSnippetSearchBounds } from '../utils';
import {
  findMinLevelTabStop,
  findTabStopGroupInDoc,
  getEffectiveLevel,
  getTabStopsFromReference,
  parseTabStops,
} from '../utils/tabstop';

/**
 * Navigate forward (Tab) through TabStop groups.
 * Returns true if a TabStop was found and activated.
 */
export function jumpToNextTabStop(view: EditorView): boolean {
  const bounds = getSnippetSearchBounds(view);
  if (!bounds) return false;

  const state = view.state.field(tabStopField, false);
  const currentGroup = state?.activeGroup ?? null;
  const maxGroup = state?.maxGroup ?? 0;
  const originCursor = state?.originCursor;
  const isJustExecuted = state?.isJustExecuted;

  let targetGroup: number;

  if (currentGroup === null) {
    // If we just executed a snippet and we have an originCursor, we should search forward from it.
    // Otherwise we use current cursor position.
    const reference = isJustExecuted && originCursor != null ? originCursor : view.state.selection.main.head;
    const stops = getTabStopsFromReference(view, reference, 1, bounds);
    const minStop = findMinLevelTabStop(stops, maxGroup);

    if (!minStop) return false;
    targetGroup = minStop.level;
  } else {
    const text = view.state.sliceDoc(bounds.from, bounds.to);
    const allStops = parseTabStops(text);

    const currentEffective = getEffectiveLevel(currentGroup, maxGroup);

    // Find the minimum effective level strictly > currentEffective
    const candidates = allStops.filter((s) => getEffectiveLevel(s.groupNum, maxGroup) > currentEffective);

    if (candidates.length === 0) {
      view.dispatch({ effects: clearTabStopEffect.of() });
      return false;
    }

    let minEffective = Infinity;
    let nextGroup = -1;
    for (const c of candidates) {
      const eff = getEffectiveLevel(c.groupNum, maxGroup);
      if (eff < minEffective) {
        minEffective = eff;
        nextGroup = c.groupNum;
      }
    }
    targetGroup = nextGroup;
  }

  return activateTabStopGroup(view, targetGroup, bounds.from, bounds.to, maxGroup, originCursor);
}

/**
 * Navigate backward (Shift-Tab) through TabStop groups.
 */
export function jumpToPrevTabStop(view: EditorView): boolean {
  const bounds = getSnippetSearchBounds(view);
  if (!bounds) return false;

  const state = view.state.field(tabStopField, false);
  const currentGroup = state?.activeGroup ?? null;
  const originCursor = state?.originCursor;

  if (currentGroup === null) return false;

  const text = view.state.sliceDoc(bounds.from, bounds.to);
  const allStops = parseTabStops(text);
  const maxGroup = state?.maxGroup ?? 0;

  const currentEffective = getEffectiveLevel(currentGroup, maxGroup);

  // Find the maximum effective level strictly < currentEffective
  const candidates = allStops.filter((s) => getEffectiveLevel(s.groupNum, maxGroup) < currentEffective);

  if (candidates.length === 0) return false;

  let maxEffective = -Infinity;
  let prevGroup = -1;
  for (const c of candidates) {
    const eff = getEffectiveLevel(c.groupNum, maxGroup);
    if (eff > maxEffective) {
      maxEffective = eff;
      prevGroup = c.groupNum;
    }
  }

  return activateTabStopGroup(view, prevGroup, bounds.from, bounds.to, maxGroup, originCursor);
}

export function activateTabStopGroup(
  view: EditorView,
  groupNum: number,
  snippetFrom: number,
  snippetTo: number,
  maxGroup: number,
  originCursor?: number | null,
): boolean {
  const occurrences = findTabStopGroupInDoc(view, groupNum, snippetFrom, snippetTo);
  if (occurrences.length === 0) return false;

  const leftToRight = [...occurrences].sort((a, b) => a.markerFrom - b.markerFrom);
  let shift = 0;
  const pendingChanges: Array<{ from: number; to: number; insert: string }> = [];
  const pendingSelections: Array<{ anchor: number; head: number }> = [];

  for (const occ of leftToRight) {
    const markerText = view.state.sliceDoc(occ.markerFrom, occ.markerTo);
    const stop = parseTabStops(markerText)[0];
    const defaultText = stop?.defaultText ?? '';

    const adjustedFrom = occ.markerFrom + shift;
    const selFrom = adjustedFrom;
    const selTo = adjustedFrom + defaultText.length;

    pendingChanges.push({ from: occ.markerFrom, to: occ.markerTo, insert: defaultText });
    pendingSelections.push({ anchor: selFrom, head: selTo });
    shift += defaultText.length - (occ.markerTo - occ.markerFrom);
  }

  const ranges = pendingSelections.map((s) => EditorSelection.range(s.anchor, s.head));
  view.dispatch({
    changes: pendingChanges,
    selection: EditorSelection.create(ranges),
    effects: [
      setTabStopEffect.of({
        activeGroup: groupNum,
        maxGroup,
        originCursor: originCursor ?? null,
        isJustExecuted: false,
      }),
    ],
    scrollIntoView: true,
    userEvent: 'input.tabjump',
  });

  return true;
}

export function jumpToFirstTabStop(
  view: EditorView,
  snippetFrom: number,
  snippetTo: number,
  originCursor: number,
): boolean {
  const text = view.state.sliceDoc(snippetFrom, snippetTo);
  const allStops = parseTabStops(text);
  const max = allStops.length > 0 ? Math.max(...allStops.map((s) => s.groupNum)) : 0;

  const items = allStops.map((s) => ({
    cursor: snippetFrom + s.index,
    level: s.groupNum,
    defaultText: s.defaultText,
    length: s.length,
  }));

  // Look forward from the originCursor to find the first tabstop
  const forwardStops = items.filter((s) => s.cursor >= originCursor).sort((a, b) => a.cursor - b.cursor);
  const minStop = findMinLevelTabStop(forwardStops, max);

  if (!minStop) {
    // Fallback if no tabstops are ahead of the origin
    const anyMin = findMinLevelTabStop(items, max);
    if (!anyMin) return false;
    return activateTabStopGroup(view, anyMin.level, snippetFrom, snippetTo, max, originCursor);
  }

  // Before activating, set state to indicate "just executed"
  // Wait, activateTabStopGroup will dispatch and clear isJustExecuted!
  // I should dispatch the effect manually or pass `isJustExecuted` to activateTabStopGroup.
  // Actually, jumpToFirstTabStop is usually called immediately after insertion,
  // so let's modify activateTabStopGroup to accept `isJustExecuted`.
  return activateTabStopGroupWithState(view, minStop.level, snippetFrom, snippetTo, max, originCursor, true);
}

function activateTabStopGroupWithState(
  view: EditorView,
  groupNum: number,
  snippetFrom: number,
  snippetTo: number,
  maxGroup: number,
  originCursor: number | null,
  isJustExecuted: boolean,
): boolean {
  const occurrences = findTabStopGroupInDoc(view, groupNum, snippetFrom, snippetTo);
  if (occurrences.length === 0) return false;

  const leftToRight = [...occurrences].sort((a, b) => a.markerFrom - b.markerFrom);
  let shift = 0;
  const pendingChanges: Array<{ from: number; to: number; insert: string }> = [];
  const pendingSelections: Array<{ anchor: number; head: number }> = [];

  for (const occ of leftToRight) {
    const markerText = view.state.sliceDoc(occ.markerFrom, occ.markerTo);
    const stop = parseTabStops(markerText)[0];
    const defaultText = stop?.defaultText ?? '';

    const adjustedFrom = occ.markerFrom + shift;
    const selFrom = adjustedFrom;
    const selTo = adjustedFrom + defaultText.length;

    pendingChanges.push({ from: occ.markerFrom, to: occ.markerTo, insert: defaultText });
    pendingSelections.push({ anchor: selFrom, head: selTo });
    shift += defaultText.length - (occ.markerTo - occ.markerFrom);
  }

  const ranges = pendingSelections.map((s) => EditorSelection.range(s.anchor, s.head));
  view.dispatch({
    changes: pendingChanges,
    selection: EditorSelection.create(ranges),
    effects: [setTabStopEffect.of({ activeGroup: groupNum, maxGroup, originCursor, isJustExecuted })],
    scrollIntoView: true,
    userEvent: 'input.tabjump',
  });

  return true;
}
