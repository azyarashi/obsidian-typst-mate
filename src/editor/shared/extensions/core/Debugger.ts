import { type Extension, StateField } from '@codemirror/state';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { SyntaxKind, SyntaxMode } from '@/utils/crates/typst-syntax';
import { editorHelperFacet } from './Helper';
import { getActiveRegion, getModeAndKind, typstMateCore } from './TypstMate';

import './Debugger.css';

import { SYMBOL_MAP } from '../decorations/MathSymbolConceal';

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
      const relativePos = cursor - region.from;

      let typstPos: number | null = null;
      if (region.processor) {
        const { id, noPreamble, format } = region.processor;
        typstPos =
          relativePos +
          id.length +
          (noPreamble ? 0 : this.helper.plugin.settings.preamble.length + 1) +
          format.indexOf('{CODE}');
      }

      const { syntaxMode, syntaxKind } = getModeAndKind(region, cursor);

      data = [
        {
          title: 'Processor',
          description: `${region.kind}${region.processor?.id ? `(${region.processor.id})` : ''}`,
        },
        { title: 'Mode', description: syntaxMode ? SyntaxMode[syntaxMode] : 'Opaque' },
        { title: 'KindCursor', description: syntaxKind ? SyntaxKind[syntaxKind] : 'End' },
        { title: 'GlobalPos', description: cursor.toString() },
        { title: 'LocalPos', description: `${relativePos.toString()} (+${region.skip.toString()})` },
        { title: 'Symbols', description: SYMBOL_MAP.size.toString() },
      ];

      if (typstPos !== null) {
        data.push({ title: 'TypstPos', description: typstPos.toString() });
      }
      data.push({ title: 'Length', description: (region.to - region.from).toString() });
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
