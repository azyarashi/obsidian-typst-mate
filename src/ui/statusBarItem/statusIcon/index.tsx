import { MarkdownView } from 'obsidian';
import type { ComponentChildren } from 'preact';

import { Status, type TypstMate } from '@/api';
import { ICONS } from '@/constants/icons';
import { diagnosticsState } from '@/editor/shared/extensions/Diagnostic';
import { appUtils, settingsManager } from '@/libs';
import { DiagnosticModal } from '@/ui/modals/diagnostic';

import { showStatusBarMenu } from './menu';

import './statusIcon.css';

export function StatusIcon({
  icon,
  className,
  color,
  onClick,
}: {
  icon: ComponentChildren;
  className?: string;
  color?: string;
  onClick?: (e?: MouseEvent) => void;
}) {
  return (
    <div
      className={`status-bar-item-icon ${className || ''} ${onClick ? 'is-clickable' : ''}`}
      style={{ color }}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        }
      }}
    >
      {icon}
    </div>
  );
}

export function CurrentStatusIcon({ status, rendering }: { status: Status; rendering: typeof TypstMate.rendering }) {
  if (status === Status.Error) {
    return (
      <div className="status-bar-item-error" onClick={(e) => showStatusBarMenu(e)}>
        <span>⚠</span>
      </div>
    );
  }

  const activeView = appUtils.app.workspace.getActiveViewOfType(MarkdownView);
  const hasError = rendering.hasError;
  const isRendering = rendering.isRendering;
  const icon = settingsManager.settings.enableBackgroundRendering ? ICONS.TypstStroke : ICONS.TypstFill;

  if (isRendering) {
    return (
      <div className="typstmate-spinner-container" onClick={(e) => showStatusBarMenu(e)}>
        <div className="status-bar-item-icon">
          <div className="typstmate-spinner" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }} onClick={(e) => showStatusBarMenu(e)}>
        <StatusIcon
          icon={ICONS.Cross}
          className="mod-clickable"
          color="var(--text-error)"
          onClick={(e) => {
            e?.stopPropagation();
            if (activeView) {
              const state = activeView.editor.cm.state.field(diagnosticsState, false);
              if (state?.diagnostics) {
                new DiagnosticModal(appUtils.app, state.diagnostics).open();
              }
            }
          }}
        />
      </div>
    );
  }

  return (
    <div onClick={(e) => showStatusBarMenu(e)}>
      <StatusIcon icon={icon} />
    </div>
  );
}
