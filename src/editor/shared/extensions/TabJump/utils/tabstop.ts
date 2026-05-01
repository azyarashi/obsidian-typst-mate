import type { EditorView } from '@codemirror/view';

export interface TabStopMatch {
  groupNum: number;
  defaultText: string;
  /** position in the source template string (before any other replacements) */
  index: number;
  /**  e.g. #.1"foo" = 8 */
  length: number;
}

export interface TabStopItem {
  cursor: number;
  level: number;
  defaultText: string;
  length: number;
}

export function parseTabStops(template: string): TabStopMatch[] {
  const results: TabStopMatch[] = [];

  for (let i = 0; i < template.length; i++) {
    if (template.charAt(i) !== '#' || template.charAt(i + 1) !== '.') continue;

    const start = i;
    let groupNum: number | null = null;
    let defaultText = '';
    let end = i + 2;

    // Consume all digits after #.
    let numStr = '';
    let j = i + 2;
    while (j < template.length && /\d/.test(template.charAt(j))) {
      numStr += template.charAt(j);
      j++;
    }

    if (numStr === '') continue;

    groupNum = parseInt(numStr, 10);
    end = j;

    // Check for optional "default text"
    if (template.charAt(end) === '{') {
      let j = end + 1;
      let depth = 1;
      while (j < template.length) {
        const char = template.charAt(j);
        if (char === '{' && template.charAt(j - 1) !== '\\') depth++;
        else if (char === '}' && template.charAt(j - 1) !== '\\') {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      if (depth === 0) {
        defaultText = template
          .slice(end + 1, j)
          .replace(/\\\{/g, '{')
          .replace(/\\\}/g, '}');
        end = j + 1;
      }
    }

    results.push({
      groupNum,
      defaultText,
      index: start,
      length: end - start,
    });

    i = end - 1;
  }

  return results;
}

export function createNextStop(doc: string) {
  const tabstops = parseTabStops(doc);
  const maxLevel = 0 < tabstops.length ? Math.max(...tabstops.map((s) => s.groupNum)) : -1;

  return `#.${maxLevel + 1}`;
}

/**
 * Gets the effective level of a tabstop. Group 0 is treated as maxGroup + 1.
 */
export function getEffectiveLevel(groupNum: number, maxGroup: number): number {
  return groupNum === 0 ? maxGroup + 1 : groupNum;
}

/**
 * Extracts a list of tabstops from the document, starting from a reference point in a specific direction.
 */
export function getTabStopsFromReference(
  view: EditorView,
  reference: number,
  direction: 1 | -1,
  bounds: { from: number; to: number },
): TabStopItem[] {
  const text = view.state.sliceDoc(bounds.from, bounds.to);
  const stops = parseTabStops(text);

  const items = stops.map((s) => ({
    cursor: bounds.from + s.index,
    level: s.groupNum,
    defaultText: s.defaultText,
    length: s.length,
  }));

  if (direction === 1) {
    return items.filter((s) => s.cursor >= reference).sort((a, b) => a.cursor - b.cursor);
  } else {
    return items.filter((s) => s.cursor <= reference).sort((a, b) => b.cursor - a.cursor);
  }
}

/**
 * Finds the tabstop with the minimum effective level from a list of tabstops.
 */
export function findMinLevelTabStop(stops: TabStopItem[], maxGroup: number): TabStopItem | null {
  if (stops.length === 0) return null;
  let minLevel = Infinity;
  let result: TabStopItem | null = null;

  for (const stop of stops) {
    const effective = getEffectiveLevel(stop.level, maxGroup);
    if (effective < minLevel) {
      minLevel = effective;
      result = stop;
    }
  }
  return result;
}

export function buildInsertResult(
  template: string,
  insertFrom: number,
): {
  insertText: string;
  groupPositions: Map<number, Array<{ from: number; to: number }>>;
  maxGroup: number;
} {
  const stops = parseTabStops(template);
  let text = template;
  const positions: Array<{ groupNum: number; textFrom: number; textTo: number }> = [];

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

export function findTabStopGroupInDoc(
  view: EditorView,
  groupNum: number,
  searchFrom: number,
  searchTo: number,
): Array<{ markerFrom: number; markerTo: number; defaultFrom: number; defaultTo: number }> {
  const text = view.state.sliceDoc(searchFrom, searchTo);
  const allStops = parseTabStops(text);
  const groupStops = allStops.filter((s) => s.groupNum === groupNum);

  return groupStops.map((stop) => {
    const markerFrom = searchFrom + stop.index;
    const markerTo = markerFrom + stop.length;
    return {
      markerFrom,
      markerTo,
      defaultFrom: markerFrom,
      defaultTo: markerFrom + stop.defaultText.length,
    };
  });
}
