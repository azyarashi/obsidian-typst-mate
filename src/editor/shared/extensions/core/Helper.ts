import { Facet } from '@codemirror/state';
import type { EditorHelper } from '@/editor';

export const editorHelperFacet = Facet.define<EditorHelper, EditorHelper>({
  combine: (values) => values[0]!,
});
