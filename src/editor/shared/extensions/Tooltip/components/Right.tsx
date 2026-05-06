import { Fragment } from 'preact';
import { useState } from 'preact/hooks';

import './Sidebar.css';
import './Right.css';
import type { TooltipData } from '../utils';

function OutlineContent({ tooltipData, scrollTo }: { tooltipData: TooltipData; scrollTo: (text: string) => void }) {
  const { hasDoc, isFunc, params } = tooltipData;
  const positional = params?.filter((p: any) => p.positional) || [];
  const named = params?.filter((p: any) => p.named) || [];

  return (
    <ul className="typstmate-outline-list">
      {hasDoc && (
        <li onClick={() => scrollTo('Description')} style={{ cursor: 'pointer', marginBottom: '8px' }}>
          Description
        </li>
      )}

      {isFunc && params && (
        <Fragment>
          {positional.length > 0 && (
            <li>
              <span
                className="typstmate-outline-subtitle"
                onClick={() => scrollTo('Positional Parameters')}
                style={{ cursor: 'pointer' }}
              >
                Positional Parameters
              </span>
              <ul className="typstmate-outline-sublist">
                {positional.map((p: any) => (
                  <li key={p.name} onClick={() => scrollTo(p.name)} style={{ cursor: 'pointer' }}>
                    <code>{p.name}</code>
                  </li>
                ))}
              </ul>
            </li>
          )}
          {named.length > 0 && (
            <li>
              <span
                className="typstmate-outline-subtitle"
                onClick={() => scrollTo('Named Parameters')}
                style={{ cursor: 'pointer' }}
              >
                Named Parameters
              </span>
              <ul className="typstmate-outline-sublist">
                {named.map((p: any) => (
                  <li key={p.name} onClick={() => scrollTo(p.name)} style={{ cursor: 'pointer' }}>
                    <code>{p.name}</code>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </Fragment>
      )}
    </ul>
  );
}

export function Right({ tooltipData }: { tooltipData: TooltipData }) {
  const { hasDoc, isFunc } = tooltipData;
  const [expanded, setExpanded] = useState(false);

  if (!hasDoc && !isFunc) return null;

  const scrollTo = (text: string) => {
    // Find the heading in Center pane and scroll to it
    const center = document.querySelector('.typstmate-tooltip-center');
    if (!center) return;

    if (text === 'Description') {
      center.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const headings = Array.from(center.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const target = headings.find((h) => h.textContent === text);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`typstmate-sidebar-right ${expanded ? 'expanded' : 'collapsed'}`}>
      {expanded && (
        <div className="typstmate-sidebar-right-content">
          <OutlineContent tooltipData={tooltipData} scrollTo={scrollTo} />
        </div>
      )}
      <div className="typstmate-sidebar-right-toggle" onClick={() => setExpanded(!expanded)}>
        <span className="typstmate-sidebar-right-toggle-icon">{expanded ? '▶' : '◀'}</span>
      </div>
    </div>
  );
}
