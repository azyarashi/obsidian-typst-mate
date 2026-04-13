import { SyntaxKind, SyntaxMode } from '@typstmate/typst-syntax';
import type { Extension } from '@codemirror/state';
import { type EditorView, type Panel, showPanel } from '@codemirror/view';
import type { VimMode } from '@vimee/core';
import { setTooltip } from 'obsidian';
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
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

function StatusBarComp({ view }: { view: EditorView }) {
  const kindRef = useRef<HTMLSpanElement>(null);
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const col = pos - line.from + 1;
  const region = getActiveRegion(view);

  // Vim status
  const vimStatus = (() => {
    try {
      return view.state.field(vimModeField, false);
    } catch {
      return null;
    }
  })();

  const activeKind = region?.activeKind ?? null;
  const activeMode = region?.activeMode ?? null;

  useEffect(() => {
    if (kindRef.current) {
      if (activeKind !== null) {
        setTooltip(kindRef.current, SyntaxKind.name(activeKind));
      } else {
        setTooltip(kindRef.current, '');
      }
    }
  }, [activeKind]);

  const modeLabel = vimStatus ? (VIM_MODE_LABEL[vimStatus.mode] ?? vimStatus.mode.toUpperCase()) : '';

  return (
    <div className="cm-typstmate-status-bar">
      {vimStatus && (
        <div className="cm-typstmate-status-bar-vim">
          <span className={`cm-typstmate-status-bar-vim-mode vim-mode-${vimStatus.mode}`}>{modeLabel}</span>
          <span className="cm-typstmate-status-bar-vim-display">{vimStatus.display}</span>
        </div>
      )}
      <div className="cm-typstmate-status-bar-spacer" />
      <span ref={kindRef} className="cm-typstmate-status-bar-item cm-typstmate-status-bar-kind">
        {activeKind !== null ? SyntaxKind[activeKind] : region ? 'End' : ''}
      </span>
      {region && <div className="cm-typstmate-status-bar-divider" />}
      <span className="cm-typstmate-status-bar-item cm-typstmate-status-bar-mode">
        {activeMode !== null ? SyntaxMode[activeMode] : region ? 'Opaque' : ''}
      </span>
      <div className="cm-typstmate-status-bar-divider" />
      <span className="cm-typstmate-status-bar-item cm-typstmate-status-bar-pos">{`${line.number}:${col}`}</span>
    </div>
  );
}

class StatusBarPanel implements Panel {
  dom: HTMLElement;

  constructor(readonly view: EditorView) {
    this.dom = document.createElement('div');
    this.render();
  }

  update() {
    this.render();
  }

  destroy() {
    render(null, this.dom);
  }

  render() {
    render(<StatusBarComp view={this.view} />, this.dom);
  }
}

export const statusBarExtension: Extension = showPanel.of((view) => new StatusBarPanel(view));
