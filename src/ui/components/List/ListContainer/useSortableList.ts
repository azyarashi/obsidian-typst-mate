import { useCallback } from 'hono/jsx';

const uuids = new WeakMap<any, string>();

export function getSortableUuid<T extends object>(item: T): string {
  let uuid = uuids.get(item);
  if (!uuid) {
    uuid = Math.random().toString(36).slice(2);
    uuids.set(item, uuid);
  }
  return uuid;
}

export function useSortableList<T extends object>({
  items,
  onSave,
  onUpdateState,
}: {
  items: T[];
  onSave: (items: T[]) => void | Promise<void>;
  onUpdateState?: () => void;
}) {
  const updateItem = useCallback(
    async (uuid: string, partial: Partial<T>) => {
      const newItems = items.map((item) => {
        if (getSortableUuid(item) === uuid) {
          const next = { ...item, ...partial };
          uuids.set(next, getSortableUuid(item));
          return next;
        }
        return item;
      });
      await onSave(newItems);
      if (onUpdateState) onUpdateState();
    },
    [items, onSave, onUpdateState],
  );

  const deleteItem = useCallback(
    async (uuid: string) => {
      const newItems = items.filter((item) => getSortableUuid(item) !== uuid);
      await onSave(newItems);
      if (onUpdateState) onUpdateState();
    },
    [items, onSave, onUpdateState],
  );

  const moveItem = useCallback(
    async (dragUuid: string, dropUuid: string, side: 'top' | 'bottom') => {
      const dragIndex = items.findIndex((a) => getSortableUuid(a) === dragUuid);
      let dropIndex = items.findIndex((a) => getSortableUuid(a) === dropUuid);

      if (dragIndex === -1 || dropIndex === -1 || dragIndex === dropIndex) return;

      if (side === 'bottom') dropIndex++;

      const newItems = [...items];
      const draggedItem = newItems.splice(dragIndex, 1)[0];
      if (dragIndex < dropIndex) dropIndex--;

      if (draggedItem) {
        newItems.splice(dropIndex, 0, draggedItem);
        await onSave(newItems);
        if (onUpdateState) onUpdateState();
      }
    },
    [items, onSave, onUpdateState],
  );

  return { updateItem, deleteItem, moveItem };
}
