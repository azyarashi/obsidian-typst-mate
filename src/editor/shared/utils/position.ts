import type { EditorView } from '@codemirror/view';

export interface PopupPosition {
  x: number;
  y: number;
  isTop: boolean;
}

export function calculatePopupPosition(view: EditorView, startOffset: number, endOffset: number): PopupPosition {
  const startCoords = view.coordsAtPos(startOffset);
  const endCoords = view.coordsAtPos(endOffset);

  if (!startCoords || !endCoords) return { x: 0, y: 0, isTop: false };

  const lineStartCoords = view.coordsAtPos(view.state.doc.lineAt(startOffset).from);

  const x =
    Math.abs(startCoords.top - endCoords.top) > 8
      ? lineStartCoords
        ? lineStartCoords.left
        : startCoords.left
      : startCoords.left;

  const popupMaxHeight = 320;
  const margin = 20;
  const spaceBelow = window.innerHeight - endCoords.bottom;
  const isTop = spaceBelow < popupMaxHeight + margin && startCoords.top > popupMaxHeight + margin;

  const y = isTop ? startCoords.top - 4 : endCoords.bottom + 2;

  return { x, y, isTop };
}
