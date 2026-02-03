import { type Extension, StateField } from '@codemirror/state';
import { type EditorView, type Panel, showPanel, type ViewUpdate } from '@codemirror/view';
import { SyntaxKind } from '@/utils/rust/crates/typst-synatx';
import type { EditorHelper } from '../../../index';
import { editorHelperFacet } from './Helper';
import { getActiveRegion, typstMateCore } from './TypstMate';
import './debug.css';

const debugStateField = StateField.define<string>({
  create: () => '',
  update: (value) => value,
});

class DebugPanel implements Panel {
  dom: HTMLElement;

  constructor(
    readonly view: EditorView,
    readonly helper: EditorHelper,
  ) {
    this.dom = document.createElement('div');
    this.dom.className = 'typst-debug-panel';
    this.render();
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet) this.render();
  }

  render() {
    const parserData = this.view.plugin(typstMateCore);
    if (!parserData) return;

    const cursor = this.view.state.selection.main.head;
    const region = getActiveRegion(this.view);

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
        (noPreamble ? 0 : this.helper.plugin.settings.preamble.length + 1) +
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

    this.dom.textContent = text;
  }
}

export const debugAstExtension: Extension = [
  debugStateField,
  showPanel.of((view) => {
    const helper = view.state.facet(editorHelperFacet);
    return helper ? new DebugPanel(view, helper) : { dom: document.createElement('div') };
  }),
];
