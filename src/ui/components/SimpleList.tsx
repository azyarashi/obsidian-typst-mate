import type { JSX } from 'preact';

import './SimpleList.css';

interface SimpleListProps<T> {
  items: T[];
  renderItem: (item: T) => JSX.Element;
  emptyMessage?: string;
  className?: string;
}

export function SimpleList<T>({ items, renderItem, emptyMessage, className }: SimpleListProps<T>) {
  return (
    <div className={`typstmate-simple-list ${className || ''}`}>
      <div className="typstmate-settings-table">
        {items.length > 0
          ? items.map(renderItem)
          : emptyMessage && <div className="setting-item-description">{emptyMessage}</div>}
      </div>
    </div>
  );
}
