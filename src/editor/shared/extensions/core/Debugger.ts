import type { Extension } from '@codemirror/state';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { SyntaxKind, SyntaxMode } from '@/utils/crates/typst-syntax';
import { editorHelperFacet } from './Helper';
import { getActiveRegion, getModeAndKind } from './TypstMate';

import './Debugger.css';

class DebugPlugin implements PluginValue {
  dom: HTMLElement;
  helper: EditorHelper;
  private lastText: string = '';

  constructor(readonly view: EditorView) {
    this.dom = document.createElement('div');
    this.dom.className = 'typstmate-debug-panel';

    view.dom.appendChild(this.dom);

    this.helper = view.state.facet(editorHelperFacet);
    if (!this.helper.plugin.settings.enableDebugger) this.dom.hide();
    this.render();
  }

  update(update: ViewUpdate) {
    const enabled = this.helper.plugin.settings.enableDebugger;
    if (enabled) this.dom.show();
    else {
      this.dom.hide();
      return;
    }

    if (update.docChanged || update.selectionSet) window.requestAnimationFrame(() => this.render());
  }

  destroy() {
    this.dom.remove();
  }

  private render() {
    if (!this.view.dom.contains(this.dom)) return;

    const cursor = this.view.state.selection.main.head;
    const region = getActiveRegion(this.view);

    const data: Array<{ title: string; description: string }> = [];

    if (region) {
      const relativePos = cursor - region.from;
      let typstPos: string = 'N/A';

      if (region.processor) {
        const { id, noPreamble, format } = region.processor;
        const offset =
          id.length + (noPreamble ? 0 : this.helper.plugin.settings.preamble.length + 1) + format.indexOf('{CODE}');
        typstPos = (relativePos + offset).toString();
      }

      const { syntaxMode, syntaxKind } = getModeAndKind(region, cursor);

      data.push(
        { title: 'Processor', description: `${region.kind}${region.processor?.id ? `(${region.processor.id})` : ''}` },
        { title: 'Mode', description: syntaxMode !== null ? SyntaxMode[syntaxMode] : 'Opaque' },
        { title: 'Kind', description: syntaxKind !== null ? SyntaxKind[syntaxKind] : 'End' },
        { title: 'GlobalPos', description: cursor.toString() },
        { title: 'LocalPos', description: `${relativePos} (+${region.skip})` },
        { title: 'TypstPos', description: typstPos },
        { title: 'Length', description: (region.to - region.from).toString() },
      );
    } else
      data.push({ title: 'Mode', description: 'Markdown' }, { title: 'Pos(Global)', description: cursor.toString() });

    const maxTitle = Math.max(...data.map((d) => d.title.length));
    const newText = `[DEBUG]\n${data.map((d) => `${d.title.padEnd(maxTitle)} : ${d.description}`).join('\n')}`;

    if (this.lastText !== newText) {
      this.dom.textContent = newText;
      this.lastText = newText;
    }
  }
}

export const debuggerExtension: Extension = ViewPlugin.fromClass(DebugPlugin);
