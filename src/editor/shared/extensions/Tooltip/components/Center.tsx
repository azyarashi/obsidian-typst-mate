import { Component, MarkdownRenderer } from 'obsidian';
import { useEffect, useRef } from 'preact/hooks';
import { appUtils } from '@/libs';

import './Center.css';

import type { TooltipData } from '../utils';

export function Center({ tooltipData }: { tooltipData: TooltipData }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const container = document.createElement('div');
    ref.current.appendChild(container);

    const component = new Component();
    component.load();

    MarkdownRenderer.render(appUtils.app, tooltipData.markdown, container, '', component).then(() => {
      // * go to
      console.log(tooltipData.links);
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
      component.unload();
      container.remove();
    };
  }, [tooltipData]);

  return <div className="typstmate-tooltip-center" ref={ref} />;
}
