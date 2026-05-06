import type { TooltipData } from '../utils';

import './Sidebar.css';

export function Left({ tooltipData }: { tooltipData: TooltipData }) {
  if (!tooltipData.isFunc) return null;

  const toggleAll = (open: boolean) => {
    // DOMPurify strips classes, so we select standard details tags
    const details = document.querySelectorAll('.typstmate-tooltip-center details');
    details.forEach((d) => {
      if (open) d.setAttribute('open', '');
      else d.removeAttribute('open');
    });
  };

  return (
    <div className="typstmate-sidebar-left">
      <div className="typstmate-sidebar-left-buttons">
        <span className="typstmate-sidebar-left-icon" onClick={() => toggleAll(true)}>
          [+]
        </span>
        <span className="typstmate-sidebar-left-icon" onClick={() => toggleAll(false)}>
          [-]
        </span>
      </div>
    </div>
  );
}
