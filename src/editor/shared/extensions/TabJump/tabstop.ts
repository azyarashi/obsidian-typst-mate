import { EditorSelection, StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** #.N or #.N"default text" */
export const TAB_STOP_REGEX = /#\.(\d+)(?:"([^"]*)")?/g;

export interface TabStopState {
  activeGroup: number | null;
  maxGroup: number;
}

export const setTabStopEffect = StateEffect.define<TabStopState>();
export const clearTabStopEffect = StateEffect.define<void>();

export const tabStopField = StateField.define<TabStopState>({
  create: () => ({ activeGroup: null, maxGroup: 0 }),
  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTabStopEffect)) return effect.value;
      if (effect.is(clearTabStopEffect)) return { activeGroup: null, maxGroup: 0 };
    }
    return state;
  },
});

export interface TabStopMatch {
  groupNum: number;
  defaultText: string;
  /** position in the source template string (before any other replacements) */
  index: number;
  /**  e.g. #.0"foo" = 8 */
  length: number;
}

export function parseTabStops(template: string): TabStopMatch[] {
  const results: TabStopMatch[] = [];
  const re = new RegExp(TAB_STOP_REGEX.source, 'g');
  let m = re.exec(template);
  while (m !== null) {
    results.push({
      groupNum: parseInt(m[1]!, 10),
      defaultText: m[2] ?? '',
      index: m.index,
      length: m[0].length,
    });
    m = re.exec(template);
  }
  return results;
}

/**
 * Given a snippet template:
 * 1. Replace all `#.N"..."` tokens with their default text in-place.
 * 2. Return the cleaned insert string and a map from absolute-document-position
 *    to each TabStop so the caller can set selections.
 */
export function buildInsertResult(
  template: string,
  insertFrom: number,
): {
  insertText: string;
  /** TabStop positions in the output document, keyed by group number */
  groupPositions: Map<number, Array<{ from: number; to: number }>>;
  maxGroup: number;
} {
  const stops = parseTabStops(template);

  // Build the final text by replacing tokens with their default text.
  // We process from right to left to keep indices stable.
  let text = template;
  // Track the offset shift as we replace tokens
  const positions: Array<{ groupNum: number; textFrom: number; textTo: number }> = [];

  // Replace left to right, tracking shifted positions
  let shift = 0;
  const sortedByIndex = [...stops].sort((a, b) => a.index - b.index);
  for (const stop of sortedByIndex) {
    const tokenStart = stop.index + shift;
    const tokenEnd = tokenStart + stop.length;
    const replaceWith = stop.defaultText;

    positions.push({
      groupNum: stop.groupNum,
      textFrom: tokenStart,
      textTo: tokenStart + replaceWith.length,
    });

    text = text.slice(0, tokenStart) + replaceWith + text.slice(tokenEnd);
    shift += replaceWith.length - stop.length;
  }

  // Convert text-local positions to absolute document positions
  const groupPositions = new Map<number, Array<{ from: number; to: number }>>();
  for (const p of positions) {
    const absFrom = insertFrom + p.textFrom;
    const absTo = insertFrom + p.textTo;
    if (!groupPositions.has(p.groupNum)) groupPositions.set(p.groupNum, []);
    groupPositions.get(p.groupNum)!.push({ from: absFrom, to: absTo });
  }

  const maxGroup = stops.length > 0 ? Math.max(...stops.map((s) => s.groupNum)) : 0;

  return { insertText: text, groupPositions, maxGroup };
}

// ─── Runtime navigation ───────────────────────────────────────────────────────

/**
 * Scan the document in [searchFrom, searchTo] for all TabStop tokens of group `groupNum`.
 * Returns the absolute positions of the *default text* (after the token is already
 * replaced in the live document – so we just look for any surviving `#.N` markers).
 *
 * NOTE: After the first insert we leave raw markers in the text so we can find them
 * on subsequent Tab presses. Each marker is removed when its group is activated.
 */
export function findTabStopGroupInDoc(
  view: EditorView,
  groupNum: number,
  searchFrom: number,
  searchTo: number,
): Array<{ markerFrom: number; markerTo: number; defaultFrom: number; defaultTo: number }> {
  const text = view.state.sliceDoc(searchFrom, searchTo);
  // Match the raw marker still in the document
  const re = new RegExp(`#\\.${groupNum}(?:"([^"]*)")?`, 'g');
  const results: Array<{ markerFrom: number; markerTo: number; defaultFrom: number; defaultTo: number }> = [];
  let m = re.exec(text);
  while (m !== null) {
    const markerFrom = searchFrom + m.index;
    const defaultText = m[1] ?? '';
    results.push({
      markerFrom,
      markerTo: markerFrom + m[0].length,
      defaultFrom: markerFrom,
      defaultTo: markerFrom + defaultText.length,
    });
    m = re.exec(text);
  }
  return results;
}

/**
 * Find the minimum group number present in [searchFrom, searchTo].
 * Returns -1 if none found.
 */
export function findMinTabStopGroup(view: EditorView, searchFrom: number, searchTo: number): number {
  const text = view.state.sliceDoc(searchFrom, searchTo);
  const re = new RegExp(TAB_STOP_REGEX.source, 'g');
  let min = Infinity;
  let m = re.exec(text);
  while (m !== null) {
    const n = parseInt(m[1]!, 10);
    if (n < min) min = n;
    m = re.exec(text);
  }
  return Number.isFinite(min) ? min : -1;
}

/**
 * Find the maximum group number strictly less than `lessThan` in [searchFrom, searchTo].
 * Used for Shift-Tab (going backwards).
 */
export function findPrevTabStopGroup(view: EditorView, searchFrom: number, searchTo: number, lessThan: number): number {
  const text = view.state.sliceDoc(searchFrom, searchTo);
  const re = new RegExp(TAB_STOP_REGEX.source, 'g');
  let max = -1;
  let m = re.exec(text);
  while (m !== null) {
    const n = parseInt(m[1]!, 10);
    if (n < lessThan && n > max) max = n;
    m = re.exec(text);
  }
  return max;
}

/**
 * Activate a TabStop group: remove the markers, insert default text, and
 * create a multi-selection over the default text ranges.
 *
 * `snippetRegion` is the [from, to) of the region to search in (the live
 * document after previous groups have been processed).
 */
export function activateTabStopGroup(
  view: EditorView,
  groupNum: number,
  snippetFrom: number,
  snippetTo: number,
  maxGroup: number,
): boolean {
  const occurrences = findTabStopGroupInDoc(view, groupNum, snippetFrom, snippetTo);
  if (occurrences.length === 0) return false;

  // To build correct selections we need to process left-to-right for position math,
  // but apply changes right-to-left for index stability.
  const leftToRight = [...occurrences].sort((a, b) => a.markerFrom - b.markerFrom);
  let shift = 0;
  const pendingChanges: Array<{ from: number; to: number; insert: string }> = [];
  const pendingSelections: Array<{ anchor: number; head: number }> = [];

  for (const occ of leftToRight) {
    const defaultMatch = view.state.sliceDoc(occ.markerFrom, occ.markerTo).match(/^#\.\d+(?:"([^"]*)")?$/);
    const defaultText = defaultMatch ? (defaultMatch[1] ?? '') : '';
    const adjustedFrom = occ.markerFrom + shift;
    const selFrom = adjustedFrom;
    const selTo = adjustedFrom + defaultText.length;

    pendingChanges.push({ from: occ.markerFrom, to: occ.markerTo, insert: defaultText });
    pendingSelections.push({ anchor: selFrom, head: selTo });
    shift += defaultText.length - (occ.markerTo - occ.markerFrom);
  }

  // Build EditorSelection from pending selections
  const ranges = pendingSelections.map((s) => EditorSelection.range(s.anchor, s.head));
  const newSelection = EditorSelection.create(ranges, 0);

  view.dispatch({
    changes: pendingChanges,
    selection: newSelection,
    effects: setTabStopEffect.of({ activeGroup: groupNum, maxGroup }),
    scrollIntoView: true,
  });

  return true;
}

/**
 * Called when navigating INTO a snippet for the first time (after insert).
 * Finds the minimum group and activates it.
 * Returns true if any TabStop was found and activated.
 */
export function jumpToFirstTabStop(view: EditorView, snippetFrom: number, snippetTo: number): boolean {
  const minGroup = findMinTabStopGroup(view, snippetFrom, snippetTo);
  if (minGroup === -1) return false;

  // Compute maxGroup from document
  const text = view.state.sliceDoc(snippetFrom, snippetTo);
  const re = new RegExp(TAB_STOP_REGEX.source, 'g');
  let max = 0;
  let m = re.exec(text);
  while (m !== null) {
    const n = parseInt(m[1]!, 10);
    if (n > max) max = n;
    m = re.exec(text);
  }

  return activateTabStopGroup(view, minGroup, snippetFrom, snippetTo, max);
}
