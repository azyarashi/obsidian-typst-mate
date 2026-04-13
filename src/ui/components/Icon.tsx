import { setTooltip } from 'obsidian';
import type { ComponentChildren, TargetedMouseEvent } from 'preact';
import './icon.css';

export function IconS({
  icon,
  isActive = true,
  className,
  title,
  onClick,
}: {
  icon: ComponentChildren;
  isActive?: boolean;
  className?: string;
  title?: string;
  onClick?: (e: TargetedMouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`typstmate-icon-s ${onClick ? 'is-clickable' : ''} ${!isActive ? 'is-dimmed' : ''} ${className ?? ''}`}
      ref={(el: HTMLDivElement | null) => {
        if (el && title) setTooltip(el, title);
      }}
      onClick={
        onClick
          ? (e: TargetedMouseEvent<HTMLDivElement>) => {
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
