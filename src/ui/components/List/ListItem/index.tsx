import type { JSX } from 'preact';
import './index.css';

export interface ListItemProps {
  summary: JSX.Element | JSX.Element[] | any;
  children?: JSX.Element | JSX.Element[] | any;
  isVertical?: boolean;
}

export function ListItem({ summary, children, isVertical = false }: ListItemProps) {
  if (!children) {
    return (
      <div className="typstmate-list-item">
        <div className={`typstmate-list-item-summary ${isVertical ? 'is-vertical' : ''}`}>{summary}</div>
      </div>
    );
  }

  return (
    <details className="typstmate-list-item">
      <summary className={`typstmate-list-item-summary ${isVertical ? 'is-vertical' : ''}`}>{summary}</summary>
      <div className="typstmate-list-item-content">{children}</div>
    </details>
  );
}
