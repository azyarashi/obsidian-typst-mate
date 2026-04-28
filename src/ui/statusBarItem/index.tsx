import { setTooltip } from 'obsidian';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Phase, TypstMate } from '@/api';
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
    phase: TypstMate.phase,
    status: TypstMate.status,
  });

  useEffect(() => {
    const origSetPhase = TypstMate.setPhase;
    const origSetStatus = TypstMate.setStatus;

    TypstMate.setPhase = (phase) => {
      origSetPhase(phase);
      setState((s) => ({ ...s, phase }));
    };
    TypstMate.setStatus = (status) => {
      origSetStatus(status);
      setState((s) => ({ ...s, status }));
    };

    return () => {
      TypstMate.setPhase = origSetPhase;
      TypstMate.setStatus = origSetStatus;
    };
  }, []);

  const { phase, status } = state;
  const isReady = phase === Phase.Ready;
  const hasLoaded = Phase.Ready <= phase;
  const tooltip = isReady ? getStatusBarTooltip({ status }) : Phase[phase];

  useEffect(() => {
    containerEl.setAttribute('data-tooltip-position', 'top');
    setTooltip(containerEl, tooltip);
  }, [tooltip, containerEl]);

  return hasLoaded ? <CurrentStatusIcon phase={phase} status={status} /> : <ProgressBar phase={phase} />;
}
