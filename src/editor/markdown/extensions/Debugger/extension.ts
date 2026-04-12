import type { Extension } from '@codemirror/state';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { SyntaxKind, SyntaxMode } from '@typstmate/typst-syntax';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { format } from '@/ui/elements/Typst';

import './Debugger.css';

class DebugPlugin implements PluginValue {
  dom: HTMLElement;
  private lastText: string = '';

  constructor(readonly view: EditorView) {
    this.dom = document.createElement('div');
    this.dom.className = 'typstmate-debug-panel';

    view.dom.appendChild(this.dom);

    this.render();
  }

  update(update: ViewUpdate) {
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
      const innerStart = region.from + region.skip;
      const code = this.view.state.sliceDoc(innerStart, region.to);
      const { offset } = format(code, region.kind, region.processor!);

      const localPos = cursor - innerStart;
      const typstPos = localPos - offset;

      const { activeMode, activeKind } = region;

      data.push(
        { title: 'Processor', description: `${region.kind}${region.processor?.id ? `(${region.processor.id})` : ''}` },
        { title: 'Mode', description: activeMode !== null ? SyntaxMode[activeMode!] : 'Opaque' },
        { title: 'Kind', description: activeKind !== null ? SyntaxKind[activeKind!] : 'End' },
        { title: 'GlobalPos', description: cursor.toString() },
        { title: 'LocalPos', description: `${localPos} (+${region.skip})` },
        { title: 'TypstPos', description: typstPos.toString() },
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
