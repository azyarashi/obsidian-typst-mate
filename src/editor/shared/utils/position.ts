import type { EditorView } from '@codemirror/view';

export interface PopupPosition {
  x: number;
  y: number;
}

export function calculatePopupPosition(view: EditorView, startOffset: number, endOffset: number): PopupPosition {
  const startCoords = view.coordsAtPos(startOffset);
  const endCoords = view.coordsAtPos(endOffset);

  if (!startCoords || !endCoords) {
    // Fallback if coordinates are not available (e.g. hidden or scrolled out)
    return { x: 0, y: 0 };
  }

  // Line start coords
  const lineStartCoords = view.coordsAtPos(view.state.doc.lineAt(startOffset).from);

  const x =
    Math.abs(startCoords.top - endCoords.top) > 8
      ? lineStartCoords
        ? lineStartCoords.left
        : startCoords.left
      : startCoords.left;

  const y = endCoords.bottom + 2;

  return { x, y };
}
