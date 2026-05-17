import { useEffect, useRef } from 'preact/hooks';
import { appUtils, rendererManager } from '@/libs';

import './Center.css';

import type { TooltipData } from '../utils';

export function Center({ tooltipData }: { tooltipData: TooltipData }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const container = document.createElement('div');
    ref.current.appendChild(container);

    const file = appUtils.app.workspace.getActiveFile();
    const ndir = file?.parent?.path ?? '/';

    rendererManager.renderTypstHtml(tooltipData.source, container, ndir).then(() => {
      // * go to
      if (0 < tooltipData.links.length) {
        const gotoContainer = document.createElement('div');
        gotoContainer.className = 'typstmate-goto-links';
        for (const link of tooltipData.links) {
          const linkElement = document.createElement('a');
          linkElement.href = link.url;
          linkElement.innerText = link.title;
          linkElement.target = '_blank';
          linkElement.rel = 'noopener noreferrer';
          gotoContainer.appendChild(linkElement);
        }
        container.appendChild(gotoContainer);
      }
    });

    return () => {
      container.remove();
    };
  }, [tooltipData]);

  return <div className="typstmate-tooltip-center" ref={ref} />;
}
