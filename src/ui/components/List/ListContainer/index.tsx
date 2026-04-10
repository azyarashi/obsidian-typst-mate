import type { JSX } from 'hono/jsx/dom/jsx-runtime';

import './index.css';

export { SortableItem, type SortableItemProps } from './SortableItem';
export { getSortableUuid, useSortableList } from './useSortableList';

interface ListProps<T> {
  items: T[];
  emptyMessage?: string;
  renderItem: (item: T, index: number) => JSX.Element;
}

export function List<T>({ items, emptyMessage, renderItem }: ListProps<T>) {
  return (
    <div className="typstmate-list">
      {items.length === 0 && emptyMessage && <p className="typstmate-ext-empty">{emptyMessage}</p>}
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}
