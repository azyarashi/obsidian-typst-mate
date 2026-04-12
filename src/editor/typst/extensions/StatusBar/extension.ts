import type { Extension } from '@codemirror/state';
import { type EditorView, type Panel, showPanel } from '@codemirror/view';
import { SyntaxKind, SyntaxMode } from '@typstmate/typst-syntax';
import type { VimMode } from '@vimee/core';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { vimModeField } from '@/editor/typst/extensions/Vim';

import './StatusBar.css';

const VIM_MODE_LABEL: Record<VimMode, string> = {
  normal: 'NORMAL',
  insert: 'INSERT',
  visual: 'VISUAL',
  'visual-line': 'V-LINE',
  'visual-block': 'V-BLOCK',
  'command-line': 'COMMAND',
};

class StatusBarPanel implements Panel {
  dom: HTMLElement;
  /** Left side: Vim mode pill + command input */
  vimEl: HTMLElement;
  vimModeEl: HTMLElement;
  vimDisplayEl: HTMLElement;
  /** Right side */
  kindEl: HTMLElement;
  modeEl: HTMLElement;
  posEl: HTMLElement;

  constructor(readonly view: EditorView) {
    this.dom = document.createElement('div');
    this.dom.className = 'cm-typstmate-status-bar';

    // ── left: Vim section ──────────────────────────────────────────────
    this.vimEl = document.createElement('div');
    this.vimEl.className = 'cm-typstmate-status-bar-vim';

    this.vimModeEl = document.createElement('span');
    this.vimModeEl.className = 'cm-typstmate-status-bar-vim-mode';

    this.vimDisplayEl = document.createElement('span');
    this.vimDisplayEl.className = 'cm-typstmate-status-bar-vim-display';

    this.vimEl.appendChild(this.vimModeEl);
    this.vimEl.appendChild(this.vimDisplayEl);

    // ── spacer ──────────────────────────────────────────────────────────
    const spacer = document.createElement('div');
    spacer.className = 'cm-typstmate-status-bar-spacer';

    // ── right: Syntax / position section ───────────────────────────────
    this.kindEl = document.createElement('span');
    this.kindEl.className = 'cm-typstmate-status-bar-item cm-typstmate-status-bar-kind';

    this.modeEl = document.createElement('span');
    this.modeEl.className = 'cm-typstmate-status-bar-item cm-typstmate-status-bar-mode';

    this.posEl = document.createElement('span');
    this.posEl.className = 'cm-typstmate-status-bar-item cm-typstmate-status-bar-pos';

    const sep = () => {
      const d = document.createElement('div');
      d.className = 'cm-typstmate-status-bar-divider';
      return d;
    };

    this.dom.appendChild(this.vimEl);
    this.dom.appendChild(spacer);
    this.dom.appendChild(this.kindEl);
    this.dom.appendChild(sep());
    this.dom.appendChild(this.modeEl);
    this.dom.appendChild(sep());
    this.dom.appendChild(this.posEl);

    this.render();
  }

  update() {
    this.render();
  }

  render() {
    const pos = this.view.state.selection.main.head;
    const line = this.view.state.doc.lineAt(pos);
    const col = pos - line.from + 1;
    this.posEl.textContent = `${line.number}:${col}`;

    // Syntax info
    const region = getActiveRegion(this.view);
    if (region) {
      const { activeKind, activeMode } = region;
      this.kindEl.textContent = activeKind !== null ? SyntaxKind[activeKind!] : 'End';
      this.modeEl.textContent = activeMode !== null ? SyntaxMode[activeMode!] : 'Opaque';
    } else {
      this.kindEl.textContent = '';
      this.modeEl.textContent = '';
    }

    // Vim status (mode + pending/command display)
    const vimStatus = (() => {
      try {
        return this.view.state.field(vimModeField, false);
      } catch {
        return null;
      }
    })();

    if (vimStatus) {
      const modeLabel = VIM_MODE_LABEL[vimStatus.mode] ?? vimStatus.mode.toUpperCase();
      this.vimModeEl.textContent = modeLabel;
      this.vimModeEl.className = `cm-typstmate-status-bar-vim-mode vim-mode-${vimStatus.mode}`;
      this.vimDisplayEl.textContent = vimStatus.display;
      this.vimEl.style.display = '';
    } else {
      // Vim extension not active — hide the section
      this.vimEl.style.display = 'none';
    }
  }
}

export const statusBarExtension: Extension = showPanel.of((view) => new StatusBarPanel(view));
