import { Phase } from '@/api';

import './progressBar.css';

export function ProgressBar({ phase }: { phase: Phase }) {
  const progress = phase === Phase.Error ? 100 : Math.min(100, (phase / Phase.Ready) * 100);
  const color = phase === Phase.Error ? 'var(--text-error)' : 'var(--text-accent)';

  return (
    <div className="typstmate-progress-bar-container">
      <div className="typstmate-progress-bar-bg">
        <div
          className="typstmate-progress-bar-fill"
          style={{
            backgroundColor: color,
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}
