import type { EditorView } from '@codemirror/view';

export interface PopupPosition {
  x: number;
  y: number;
  above: boolean;
}

/** px */
interface CalculatePopOverPositionProps {
  view: EditorView;
  /**
   * default: auto
   */
  above?: boolean;
  /**
   * default: 450
   */
  popOverMaxWidth?: number;
  /**
   * default: window.innerHeight * 0.95
   */
  popOverMaxHeight?: number;
}

interface CalculatePopOverPositionByFromAndToProps extends CalculatePopOverPositionProps {
  from: number;
  to: number;
  /**
   * default: false
   */
  avoidOverlap?: boolean;
}

/**
 * InlinePreview
 */
export function calculatePopOverPositionByFromAndTo(
  props: CalculatePopOverPositionByFromAndToProps,
): PopupPosition | undefined {
  const { view, from, to } = props;

  const startCoords = view.coordsAtPos(from);
  const endCoords = view.coordsAtPos(to);
  if (!startCoords || !endCoords) return undefined;

  const popOverMaxWidth = props.popOverMaxWidth ?? 450;
  const popOverMaxHeight = props.popOverMaxHeight ?? window.innerHeight * 0.95;

  const lineAtFrom = view.state.doc.lineAt(from);
  const lineStartCoords = view.coordsAtPos(lineAtFrom.from) ?? startCoords;

  let { above } = props;
  // 上に表示するかを決定
  if (above === undefined) {
    const spaceBelow = window.innerHeight - endCoords.bottom;
    above = spaceBelow < popOverMaxHeight && spaceBelow < startCoords.top;
  }

  const { avoidOverlap } = props;
  // x 座標を決定
  let x: number;
  if (above) x = startCoords.left;
  else if (avoidOverlap) x = lineStartCoords.left;
  else x = startCoords.left;
  const spaceRight = window.innerWidth - (x + popOverMaxWidth);
  if (spaceRight < 0) x += spaceRight;
  if (x < 0) x = 0;

  // y 座標を決定
  let y: number;
  if (above) y = startCoords.top;
  else if (avoidOverlap) y = Math.max(startCoords.bottom, endCoords.bottom);
  else y = startCoords.bottom;

  return { x, y, above };
}

interface CalculatePopOverPositionByCursorProps extends CalculatePopOverPositionProps {
  cursor: number;
}

/**
 * Autocomplete, Tooltip, Linter
 */
export function calculatePopOverPositionByCursor(
  props: CalculatePopOverPositionByCursorProps,
): PopupPosition | undefined {
  const { view, cursor } = props;

  const coords = view.coordsAtPos(cursor, -1);
  if (!coords) return undefined;

  const popOverMaxWidth = props.popOverMaxWidth ?? 450;
  const popOverMaxHeight = props.popOverMaxHeight ?? window.innerHeight * 0.95;

  let { above } = props;
  // 上に表示するかを決定
  if (above === undefined) {
    const spaceBelow = window.innerHeight - coords.bottom;
    above = spaceBelow < popOverMaxHeight && spaceBelow < coords.top;
  }

  // x 座標を決定
  let x = coords.left;
  const spaceRight = window.innerWidth - (x + popOverMaxWidth);
  if (spaceRight < 0) x += spaceRight;
  if (x < 0) x = 0;

  // y 座標を決定
  let y: number;
  if (above) y = coords.top;
  else y = coords.bottom;

  return { x, y, above };
}
