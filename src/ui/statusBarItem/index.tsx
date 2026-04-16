import { setTooltip } from 'obsidian';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Status, TypstMate } from '@/api';
import { ProgressBar } from './progressBar';
import { CurrentStatusIcon } from './statusIcon';
import { getStatusBarTooltip } from './tooltip';

import './statusBarItem.css';

export function setStatusBarItem(containerEl: HTMLElement) {
  containerEl.addClass('typstmate-status-bar-item');
  render(<StatusBarItem containerEl={containerEl} />, containerEl);
}

export function hideStatusBarItem(containerEl: HTMLElement) {
  render(null, containerEl);
}

export function StatusBarItem({ containerEl }: { containerEl: HTMLElement }) {
  const [state, setState] = useState({
    status: TypstMate.status,
    rendering: TypstMate.rendering,
  });

  useEffect(() => {
    TypstMate.update = (status, rendering) => {
      if (status) TypstMate.status = status;
      if (rendering) TypstMate.rendering = rendering;
      setState((_) => ({
        status: TypstMate.status,
        rendering: TypstMate.rendering,
      }));
    };
    return () => {};
  }, []);

  const { status, rendering } = state;
  const isReady = status === Status.Ready;
  const hasLoaded = Status.Ready <= status;
  const tooltip = isReady ? getStatusBarTooltip({ rendering }) : Status[status];

  useEffect(() => {
    containerEl.setAttribute('data-tooltip-position', 'top');
    setTooltip(containerEl, tooltip);
  }, [tooltip, containerEl]);

  return hasLoaded ? <CurrentStatusIcon status={status} rendering={rendering} /> : <ProgressBar status={status} />;
}
