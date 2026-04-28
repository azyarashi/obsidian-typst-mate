import type { ComponentChildren, JSX } from 'preact';
import { Phase, State, type Status } from '@/api';
import { ICONS } from '@/constants/icons';
import { settingsManager } from '@/libs';
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
      className={`typstmate-status-bar-item-icon ${className || ''} ${onClick ? 'is-clickable' : ''}`}
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

export function CurrentStatusIcon({ phase, status }: { phase: Phase; status: Status }) {
  const failedToLoad = Phase.Ready < phase;
  const hasError = status.state === State.Error;
  const isRendering = status.state === State.Rendering;
  const shouldWarn = failedToLoad || hasError;

  let icon: JSX.Element;
  if (failedToLoad) icon = ICONS.AlertTriangle;
  else if (isRendering) icon = ICONS.Loading;
  else if (hasError) icon = ICONS.Cross;
  else if (settingsManager.settings.enableBackgroundRendering) icon = ICONS.TypstStroke;
  else icon = ICONS.TypstFill;

  return (
    <div onClick={(e) => showStatusBarMenu(e)}>
      <StatusIcon icon={icon} color={shouldWarn ? 'var(--text-error)' : undefined} />
    </div>
  );
}
