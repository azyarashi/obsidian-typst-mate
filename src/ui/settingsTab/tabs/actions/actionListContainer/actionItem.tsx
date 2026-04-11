import { IconS } from '@components/Icon';
import { SortableItem } from '@components/List/ListContainer';
import { DropdownComponent, TextAreaComponent, TextComponent } from '@components/obsidian/components';
import {
  type ActionContext,
  ActionContexts,
  type ActionDef,
  type ActionType,
  CONTEXT_ICON_MAP,
  type TriggerType,
  TriggerTypes,
} from '@/libs/action';

export function ActionItem({
  action,
  uuid,
  onUpdate,
  onDelete,
  onMove,
}: {
  action: ActionDef;
  uuid: string;
  onUpdate: (uuid: string, partial: Partial<ActionDef>) => void;
  onDelete: (uuid: string) => void;
  onMove: (dragUuid: string, dropUuid: string, side: 'top' | 'bottom') => void;
}) {
  const handleUpdate = <T extends keyof ActionDef>(field: T, value: ActionDef[T]) => {
    onUpdate(uuid, { [field]: value });
  };

  const handleUpdateTrigger = <T extends keyof ActionDef['trigger']>(field: T, value: ActionDef['trigger'][T]) => {
    handleUpdate('trigger', { ...action.trigger, [field]: value });
  };

  const handleUpdateAction = <T extends keyof ActionDef['action']>(field: T, value: ActionDef['action'][T]) => {
    handleUpdate('action', { ...action.action, [field]: value });
  };

  const preventAccordion = (e: MouseEvent | Event | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const preventEscClose = (e: KeyboardEvent | any) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      const nativeEvent = (e as any).nativeEvent;
      if (nativeEvent?.stopImmediatePropagation) {
        nativeEvent.stopImmediatePropagation();
      }
      if (e.target instanceof HTMLElement) {
        e.target.blur();
      }
    }
  };

  const toggleContext = (context: ActionContext) => {
    const newContexts = action.contexts.includes(context)
      ? action.contexts.filter((c) => c !== context)
      : [...action.contexts, context];
    handleUpdate('contexts', newContexts);
  };

  const triggerType = action.trigger.t;
  const triggerValue = action.trigger.v;

  const actionType = action.action.t;
  const actionValue = action.action.v;

  const triggerId = `trigger-type-${uuid}`;
  const actionId = `action-type-${uuid}`;

  return (
    <SortableItem
      uuid={uuid}
      onMove={onMove}
      onDelete={() => onDelete(uuid)}
      deleteLabel="Delete action"
      idInput={
        <div onClick={preventAccordion}>
          <TextComponent
            build={(text) => {
              text
                .setValue(action.id)
                .setPlaceholder('Action ID')
                .onChange((val: string) => handleUpdate('id', val));
              text.inputEl.onkeydown = preventEscClose;
            }}
          />
        </div>
      }
      summaryFields={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--size-2-2)' }} onClick={preventAccordion}>
          <label htmlFor={triggerId}>Trigger:</label>
          <DropdownComponent
            build={(dropdown) => {
              dropdown.selectEl.id = triggerId;
              dropdown
                .addOptions(Object.fromEntries(TriggerTypes.map((t) => [t, t])))
                .setValue(triggerType)
                .onChange((val: string) => handleUpdateTrigger('t', val as TriggerType));
            }}
          />
          <TextComponent
            build={(text) => {
              text
                .setValue(triggerValue)
                .setPlaceholder(
                  (() => {
                    switch (triggerType) {
                      case 'hotkey':
                        return 'Press keys... (ESC to exit)';
                      case 'regex':
                        return '^regex...';
                      case 'type':
                        return 'text to type...';
                      case 'long-press':
                        return 'text for long-press...';
                      default:
                        return 'Value...';
                    }
                  })(),
                )
                .onChange((val: string) => {
                  if (triggerType !== 'hotkey') {
                    handleUpdateTrigger('v', val);
                  }
                })
                .setDisabled(triggerType === 'hotkey');

              text.inputEl.onkeydown = (e: any) => {
                if (triggerType === 'hotkey') {
                  e.preventDefault();
                  if (e.key === 'Escape') {
                    preventEscClose(e);
                    return;
                  }
                  e.stopPropagation();
                  if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock', 'Dead'].includes(e.key)) {
                    return;
                  }
                  const modifiers = [];
                  if (e.ctrlKey || e.metaKey) modifiers.push('Mod');
                  if (e.altKey) modifiers.push('Alt');
                  if (e.shiftKey) modifiers.push('Shift');

                  let keyString = e.key;
                  if (keyString === ' ') keyString = 'Space';
                  else if (keyString.length === 1) keyString = keyString.toLowerCase();

                  const hotkey = [...modifiers, keyString].join('-');
                  handleUpdateTrigger('v', hotkey);
                } else {
                  preventEscClose(e);
                }
              };
            }}
          />
        </div>
      }
      quickIcons={ActionContexts.map((context) => (
        <IconS
          key={context}
          icon={CONTEXT_ICON_MAP[context]}
          title={context}
          isActive={action.contexts.includes(context)}
          onClick={() => toggleContext(context)}
        />
      ))}
      detailsContent={
        <>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--size-2-2)', marginLeft: 'var(--size-4-2)' }}
            onClick={preventAccordion}
          >
            <label htmlFor={actionId}>Action:</label>
            <DropdownComponent
              build={(dropdown) => {
                dropdown.selectEl.id = actionId;
                dropdown
                  .addOptions({
                    snippet: 'snippet',
                    script: 'script',
                    command: 'command',
                  })
                  .setValue(actionType)
                  .onChange((val: string) => handleUpdateAction('t', val as ActionType));
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--size-2-2)' }} onClick={preventAccordion}>
            <span style={{ fontSize: 'var(--font-ui-smaller)', color: 'var(--text-muted)' }}>Action Value:</span>
            <TextAreaComponent
              build={(textArea) => {
                textArea
                  .setValue(actionValue)
                  .setPlaceholder('...')
                  .onChange((val: string) => handleUpdateAction('v', val));
                textArea.inputEl.onkeydown = preventEscClose;
              }}
            />
          </div>
        </>
      }
    />
  );
}
