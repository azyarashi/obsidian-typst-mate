import type { ActionDef } from '@/libs/action';
import { ButtonComponent } from '../../obsidian/components';
import { ListItem } from './index';

import './ActionListItem.css';

export function ActionListItem({
  action,
  isOpen,
  onToggle,
  onDelete,
}: {
  action: ActionDef;
  isOpen?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  return (
    <ListItem
      summary={
        <div className="typstmate-action-list-item-summary">
          <div className="typstmate-action-list-item-info">
            <span className="typstmate-action-list-item-trigger">{`Trigger: ${action.trigger?.t || ''} ${action.trigger?.v || ''}`}</span>
            <span className="typstmate-action-list-item-action">{`Action: ${action.action?.t || ''} ${action.action?.v || ''}`}</span>
          </div>
          <div className="typstmate-action-list-item-controls">
            <ButtonComponent
              build={(btn) => btn.setButtonText(isOpen ? 'Close' : 'Edit').onClick(() => onToggle?.())}
            />
            <ButtonComponent build={(btn) => btn.setButtonText('Delete').onClick(() => onDelete?.())} />
          </div>
        </div>
      }
      isVertical={false}
    />
  );
}
