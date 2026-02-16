import { Facet } from '@codemirror/state';
import type { EditorHelper } from '@/editor';

export const editorHelperFacet = Facet.define<EditorHelper, EditorHelper | null>({
  combine: (values) => values[0] ?? null,
});
