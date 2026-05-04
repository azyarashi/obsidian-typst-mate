import type { EditorView } from '@codemirror/view';
import { getActiveRegion } from '@/editor';

export function getSnippetSearchBounds(view: EditorView): { from: number; to: number } | null {
  const region = getActiveRegion(view);
  if (region) return { from: region.from + region.skip, to: region.to };
  // Fallback: search current line
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  return { from: line.from, to: line.to };
}
