import { type Extension, StateField } from '@codemirror/state';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import type { EditorHelper } from '@/editor';

import { editorHelperFacet } from './Helper';
import { getActiveRegion, typstMateCore } from './TypstMate';

import './Debugger.css';

const debugStateField = StateField.define<string>({
  create: () => '',
  update: (value) => value,
});

class DebugPlugin implements PluginValue {
  dom: HTMLElement;
  helper: EditorHelper | null;

  constructor(readonly view: EditorView) {
    this.helper = view.state.facet(editorHelperFacet);
    this.dom = document.createElement('div');
    this.dom.className = 'typstmate-debug-panel';
    view.dom.appendChild(this.dom);

    if (!this.helper || !this.helper.plugin.settings.enableDebugger) this.dom.hide();
    else this.render();
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet) this.render();
  }

  destroy() {
    this.dom.remove();
  }

  render() {
    if (!this.helper) return;

    const parserData = this.view.plugin(typstMateCore);
    if (!parserData) return;

    const cursor = this.view.state.selection.main.head;
    const region = getActiveRegion(this.view);

    let data: Array<{ title: string; description: string }> = [];

    if (region) {
      if (!region.processor) return;
      const { id, noPreamble, format } = region.processor;

      const relativePos = cursor - region.from;
      const typstPos =
        relativePos +
        id.length +
        (noPreamble ? 0 : this.helper.plugin.settings.preamble.length + 1) +
        format.indexOf('{CODE}');

      data = [
        { title: 'Processor', description: `${region.kind}${id ? `(${id})` : ''}` },
        { title: 'Mode', description: 'Equation' },
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

export const debuggerExtension: Extension = [debugStateField, ViewPlugin.fromClass(DebugPlugin)];
