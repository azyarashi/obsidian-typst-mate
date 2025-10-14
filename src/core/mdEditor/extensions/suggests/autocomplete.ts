import type { EditorHelper } from 'md@/index';
import { autocompletion } from '@codemirror/autocomplete';

interface CompletionItem {
  label?: string;
  name?: string;
  type?: string;
  detail?: string;
  info?: string;
  apply?: string;
}

export const createAutocompleteExtension = (helper: EditorHelper) => {
  return autocompletion({
    override: [
      async (context) => {
        try {
          const { pos } = context;
          const completions = await helper.plugin.typst.autocomplete(pos);

          if (!completions || completions.length === 0) return null;

          return {
            from: pos,
            options: completions.map((completion: CompletionItem) => ({
              label: completion.label || completion.name || '',
              type: completion.type || 'text',
              detail: completion.detail,
              info: completion.info,
              apply: completion.apply || completion.name || '',
            })),
          };
        } catch (error) {
          console.error('Autocomplete failed:', error);
          return null;
        }
      },
    ],
  });
};
