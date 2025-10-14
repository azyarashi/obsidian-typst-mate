import { snippetRegex } from 'md@/elements/SnippetSuggest';
import type { EditorHelper } from 'md@/index';
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import type { Editor } from 'obsidian';

interface CompletionItem {
  label?: string;
  name?: string;
  type?: string;
  detail?: string;
  info?: string;
  apply?: string;
}

export const trySnippetSuggest = (editor: Editor | undefined, offset: number): boolean => {
  if (!editor) return false;

  const cursor = editor.offsetToPos(offset);
  const line = editor.getLine(cursor.line);
  const textBeforeCursor = line.slice(0, cursor.ch);

  // symbol / snippet
  if (textBeforeCursor.endsWith('@') && !textBeforeCursor.startsWith('#import')) {
    const match = textBeforeCursor.match(snippetRegex);
    if (match) {
      if (match.groups?.query === undefined) return true;

      // スニペットサジェストを表示するロジック
      // 実際の実装ではSnippetSuggestElementを使用
      return true;
    }
  }

  return false;
};

export const createSnippetSuggestExtension = (helper: EditorHelper) => {
  return autocompletion({
    override: [
      async (context: CompletionContext) => {
        try {
          const { pos } = context;

          if (!completions || completions.length === 0) return null;

          return {
            from: pos,
            options: completions.map((completion: CompletionItem) => ({
              a: 'b',
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
