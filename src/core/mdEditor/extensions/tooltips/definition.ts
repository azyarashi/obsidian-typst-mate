import type { EditorHelper } from 'md@/index';
import { hoverTooltip } from '@codemirror/view';

export const createDefinitionExtension = (helper: EditorHelper) => {
  return hoverTooltip(async (view, pos, side) => {
    const { from, to } = view.state.doc.lineAt(pos);

    try {
      const definition = await helper.plugin.typst.definition(pos);
      if (!definition) return null;

      const content = typeof definition === 'string' ? definition : JSON.stringify(definition);

      return {
        pos: from,
        end: to,
        create(view) {
          const dom = document.createElement('div');
          dom.textContent = content;
          dom.className = 'typst-definition-tooltip';
          return { dom };
        },
      };
    } catch (error) {
      console.error('Failed to get definition:', error);
      return null;
    }
  });
};
