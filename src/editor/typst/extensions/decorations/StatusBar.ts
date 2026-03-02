import type { Extension } from '@codemirror/state';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { getActiveRegion, getModeAndKind } from '@/editor/shared/extensions/core/TypstMate';
import { SyntaxKind, SyntaxMode } from '@/utils/crates/typst-syntax';

import './StatusBar.css';

class StatusBarPlugin implements PluginValue {
  dom: HTMLElement;
  modeEl: HTMLElement;
  kindEl: HTMLElement;
  posEl: HTMLElement;
  currentSyntaxKind: SyntaxKind | null = null;

  constructor(readonly view: EditorView) {
    this.dom = document.createElement('div');
    this.dom.className = 'cm-typstmate-status-bar';

    this.kindEl = document.createElement('span');
    this.kindEl.className = 'cm-typstmate-status-bar-item';

    this.modeEl = document.createElement('span');
    this.modeEl.className = 'cm-typstmate-status-bar-item';

    this.posEl = document.createElement('span');
    this.posEl.className = 'cm-typstmate-status-bar-item';

    const div1 = document.createElement('div');
    div1.className = 'cm-typstmate-status-bar-divider';
    const div2 = document.createElement('div');
    div2.className = 'cm-typstmate-status-bar-divider';

    this.dom.appendChild(this.kindEl);
    this.dom.appendChild(div1);
    this.dom.appendChild(this.modeEl);
    this.dom.appendChild(div2);
    this.dom.appendChild(this.posEl);

    view.dom.appendChild(this.dom);
    this.render();
  }

  update(update: ViewUpdate) {
    if (update.selectionSet || update.docChanged || update.viewportChanged) {
      this.render();
    }
  }

  destroy() {
    this.dom.remove();
  }

  render() {
    const pos = this.view.state.selection.main.head;
    const line = this.view.state.doc.lineAt(pos);
    const col = pos - line.from + 1;

    const region = getActiveRegion(this.view);
    const { syntaxKind, syntaxMode } = getModeAndKind(region, pos);
    this.currentSyntaxKind = syntaxKind; // TODO: name の表示

    this.kindEl.textContent = syntaxKind !== null ? SyntaxKind[syntaxKind] : 'End';
    this.modeEl.textContent = syntaxMode !== null ? SyntaxMode[syntaxMode] : 'Opaque';
    this.posEl.textContent = `${line.number}:${col}`;
  }
}

export const statusBarExtension: Extension = ViewPlugin.fromClass(StatusBarPlugin);
