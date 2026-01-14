import { type Extension, StateField } from '@codemirror/state';
import type { Panel } from '@codemirror/view';
import { showPanel } from '@codemirror/view';
import { SyntaxKind } from '@/utils/rust/crates/typst-synatx';
import type { EditorHelper } from '../../..';
import { editorHelperFacet } from './Helper';
import { typstMatePlugin } from './TypstMate';
import './debug.css';

const debugStateField = StateField.define<string>({
  create: () => '',
  update: (value) => value, // Panel handles updates via its own update method
});

export const debugAstExtension: Extension = [
  debugStateField,
  showPanel.of((view) => {
    const helper = view.state.facet(editorHelperFacet);
    return helper ? createDebugPanel(helper) : { dom: document.createElement('div') };
  }),
];

const createDebugPanel = (editorHelper: EditorHelper): Panel => {
  const dom = document.createElement('div');
  dom.className = 'typst-debug-panel';

  return {
    dom,
    update(update) {
      if (!update.docChanged && !update.selectionSet) return;

      const parserData = update.view.plugin(typstMatePlugin);
      if (!parserData) return;

      const cursor = update.state.selection.main.head;
      const region = parserData.parsedRegions.find((r) => r.from <= cursor && cursor <= r.to);

      let data: Array<{ title: string; description: string }> = [];

      if (region) {
        const token = region.tokens.find((t) => t.from <= cursor && cursor < t.to);
        if (!region.processor) return;
        const { id, noPreamble, format } = region.processor;

        const syntaxKind = token ? token.kind : SyntaxKind.End;
        const syntaxMode = token?.mode ?? region.mode;
        const relativePos = cursor - region.from;
        const typstPos =
          relativePos +
          id.length +
          (noPreamble ? 0 : editorHelper.plugin.settings.preamble.length + 1) +
          format.indexOf('{CODE}');

        data = [
          { title: 'Processor', description: `${region.kind}${id ? `(${id})` : ''}` },
          { title: 'Mode', description: syntaxMode },
          { title: 'Kind', description: syntaxKind },
          { title: 'GlobalPos', description: cursor.toString() },
          { title: 'LocalPos', description: `${relativePos.toString()} (+${region.skip.toString()})` },
          { title: 'TypstPos', description: typstPos.toString() },
          { title: 'Length', description: (region.to - region.from).toString() },
        ];
      } else {
        data = [
          { title: 'Mode', description: 'Markdown' },
          { title: 'Pos (Global)', description: cursor.toString() },
        ];
      }

      const maxTitleLength = Math.max(...data.map((d) => d.title.length));
      const text = `[DEBUG]\n${data.map((d) => `${d.title.padEnd(maxTitleLength)} : ${d.description}`).join('\n')}`;

      dom.textContent = text;
    },
  };
};
