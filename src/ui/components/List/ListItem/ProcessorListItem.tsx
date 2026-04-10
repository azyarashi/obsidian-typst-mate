import { ToggleComponent } from '../../obsidian/components';
import { ListItem } from './index';

import './ProcessorListItem.css';

export function ProcessorListItem({ kind }: { kind: string }) {
  return (
    <ListItem
      summary={
        <div className="typstmate-processor-list-item-summary">
          <div className="typstmate-processor-list-item-left">
            <span className="typstmate-drag-handle">≡</span>
            <span className="typstmate-up-down-arrows">↕</span>
            <span className="typstmate-processor-id">{kind} Processor</span>
            <span className="typstmate-renderer-select">Renderer: HTML</span>
            <span className="typstmate-style-select">Style: Inline</span>
          </div>
          <div className="typstmate-processor-list-item-right">
            <ToggleComponent build={(toggle) => toggle.setValue(true).onChange(() => {})} />
          </div>
        </div>
      }
      isVertical={true}
    >
      <div className="typstmate-processor-code-block">Code Block Content Goes Here</div>
    </ListItem>
  );
}
