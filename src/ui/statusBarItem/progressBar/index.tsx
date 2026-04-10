import { Status } from '@/api';

import './progressBar.css';

export function ProgressBar({ status }: { status: Status }) {
  const progress = status === Status.Error ? 100 : Math.min(100, (status / Status.Ready) * 100);
  const color = status === Status.Error ? 'var(--text-error)' : 'var(--text-accent)';

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
