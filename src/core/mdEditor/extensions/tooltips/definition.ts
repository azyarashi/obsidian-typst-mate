import type { EditorHelper } from 'md@/index';
import { hoverTooltip } from '@codemirror/view';
import type { SpanSer } from '../../../../../pkg/typst_wasm';
import type { MathObject } from '../others/math';

export const createDefinitionExtension = (helper: EditorHelper, getMathObject: () => MathObject | null) => {
  return hoverTooltip(async (view, pos, side) => {
    try {
      const mathObject = getMathObject();
      if (!mathObject) return null;
      if (pos < mathObject.startOffset || mathObject.endOffset < pos) return null;

      const definition = await helper.plugin.typst.definition(
        pos - mathObject.startOffset + helper.plugin.typstManager.beforeCodeIndex,
      );
      if (!definition) return null;
      const kind = definition.kind as 'Span' | 'Std';

      /*const content = typeof definition === 'string' ? definition : JSON.stringify(definition);
      console.log(content);*/

      return {
        pos: pos - 1,
        end: view.state.doc.lineAt(pos).to,
        create(view) {
          const dom = document.createElement('div');
          if (kind === 'Span') {
            const { content, start, end } = definition.content as SpanSer;
            dom.textContent = content.slice(start, end);
          } else {
            dom.textContent = 'a';
            console.log(definition.content);
          }
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
