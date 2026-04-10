import { type Child, useEffect, useRef, useState } from 'hono/jsx';
import type { DragEvent, MouseEvent } from 'hono/jsx/dom';
import { setTooltip } from 'obsidian';
import { ICONS } from '@/constants/icons';
import { IconS } from '../../Icon';

export interface SortableItemProps {
  uuid: string;
  isFixed?: boolean;
  onMove: (dragUuid: string, dropUuid: string, side: 'top' | 'bottom') => void;
  onDelete?: () => void;
  deleteLabel?: string;
  idInput?: Child;
  summaryFields?: Child;
  quickIcons?: Child;
  mainField?: Child;
  detailsContent?: Child;
  onOpenStateChange?: (open: boolean) => void;
}

export let currentDragUuid: string | null = null;

export function SortableItem({
  uuid,
  isFixed,
  onMove,
  onDelete,
  deleteLabel = 'Delete',
  idInput,
  summaryFields,
  quickIcons,
  mainField,
  detailsContent,
  onOpenStateChange,
}: SortableItemProps) {
  const itemRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [dropSide, setDropSide] = useState<'top' | 'bottom' | null>(null);

  const gripIconRef = useRef<HTMLDivElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // No setIcon needed, using JSX

  useEffect(() => {
    if (deleteButtonRef.current && deleteLabel) {
      setTooltip(deleteButtonRef.current, deleteLabel);
    }
  }, [deleteLabel]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (isFixed) return;
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      const midpoint = rect.top + rect.height / 2;
      let newSide: 'top' | 'bottom' | null = e.clientY < midpoint ? 'top' : 'bottom';

      if (currentDragUuid === uuid) {
        newSide = null; // 自分自身にはドロップインジケータを出さない
      } else if (currentDragUuid) {
        // 元の場所に戻るだけ（構造的な変化がない）場所にはインジケータを出さない
        const draggedEl = document.querySelector(`[data-uuid="${currentDragUuid}"]`);
        if (draggedEl) {
          if (newSide === 'top' && itemRef.current?.previousElementSibling === draggedEl) {
            newSide = null;
          } else if (newSide === 'bottom' && itemRef.current?.nextElementSibling === draggedEl) {
            newSide = null;
          }
        }
      }

      if (dropSide !== newSide) setDropSide(newSide);
    }
  };

  const handleDragLeave = () => setDropSide(null);

  const handleDropInternal = (e: DragEvent) => {
    setDropSide(null);
    if (isFixed) return;

    const dragUuid = e.dataTransfer?.getData('dragUuid');
    if (!dragUuid || dragUuid === uuid) return;

    const rect = itemRef.current?.getBoundingClientRect();
    let actualSide: 'top' | 'bottom' = 'bottom';
    if (rect) {
      const midpoint = rect.top + rect.height / 2;
      actualSide = e.clientY < midpoint ? 'top' : 'bottom';
    }

    onMove(dragUuid, uuid, actualSide);
  };

  const handleDragStart = (e: DragEvent) => {
    if (!e.dataTransfer || !summaryRef.current) return;
    e.dataTransfer.setDragImage(summaryRef.current, 20, 20);
    e.dataTransfer.setData('dragUuid', uuid);
    currentDragUuid = uuid;
  };

  const handleDragEnd = () => {
    currentDragUuid = null;
  };

  const preventAccordion = (e: MouseEvent | Event | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <details
      ref={itemRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      data-uuid={uuid}
      className={`typstmate-sortable-item ${dropSide ? `typstmate-drag-over-${dropSide}` : ''} ${isFixed ? 'is-fixed' : ''}`}
      style={{
        position: 'relative',
        border: '1px solid var(--background-modifier-border)',
        borderRadius: 'var(--radius-s)',
        backgroundColor: 'var(--background-primary)',
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget && (e.key === ' ' || e.key === 'Enter')) {
          if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
          if (e.target instanceof HTMLTextAreaElement) return;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onToggle={() => {
        if (onOpenStateChange && itemRef.current) {
          onOpenStateChange(itemRef.current.open);
        }
      }}
    >
      <summary
        ref={summaryRef as any}
        style={{
          display: 'block',
          listStyle: 'none',
          padding: 'var(--size-4-2)',
          cursor: 'default',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--size-4-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--size-4-2)', alignItems: 'center' }}>
            {!isFixed && (
              <div
                className="typstmate-drag-handle-icon"
                ref={gripIconRef}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                style={{ cursor: 'grab' }}
              >
                {ICONS.GripHorizontal}
              </div>
            )}

            {idInput}

            {summaryFields}

            <div style={{ display: 'flex', marginLeft: 'auto', gap: 'var(--size-2-2)' }}>
              {quickIcons}
              <IconS
                icon={ICONS.Settings}
                title="Settings"
                onClick={() => {
                  if (itemRef.current) itemRef.current.open = !itemRef.current.open;
                }}
              />
            </div>
          </div>

          {mainField}
        </div>
      </summary>

      <div
        style={{
          padding: 'var(--size-4-2)',
          backgroundColor: 'var(--background-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--size-4-2)',
        }}
      >
        {detailsContent}
        {onDelete && (
          <button
            ref={deleteButtonRef}
            onClick={(e) => {
              preventAccordion(e);
              onDelete();
            }}
            style={{ cursor: 'pointer', color: 'var(--text-error)' }}
          >
            {deleteLabel}
          </button>
        )}
      </div>
    </details>
  );
}
