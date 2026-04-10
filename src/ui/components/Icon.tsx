import type { Child, MouseEvent } from 'hono/jsx';
import { setTooltip } from 'obsidian';
import './icon.css';

export function IconS({
  icon,
  isActive = true,
  title,
  onClick,
}: {
  icon: Child;
  isActive?: boolean;
  title?: string;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <div
      className={`typstmate-icon-s ${onClick ? 'is-clickable' : ''} ${!isActive ? 'is-dimmed' : ''}`}
      ref={(el: HTMLElement) => {
        if (el && title) setTooltip(el, title);
      }}
      onClick={
        onClick
          ? (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onClick(e);
            }
          : undefined
      }
    >
      {icon}
    </div>
  );
}
