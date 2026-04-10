import { getSortableUuid, List, useSortableList } from '@components/List/ListContainer';
import { useState } from 'hono/jsx/dom';
import { debounce } from 'obsidian';
import { extensionManager, settingsManager } from '@/libs';
import { type ActionDef, ActionTypes, TriggerTypes } from '@/libs/action';
import { ActionItem } from './actionItem';

export function ActionListContainer() {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  const actions = settingsManager.settings.actions;

  const { updateItem, deleteItem, moveItem } = useSortableList<ActionDef>({
    items: actions,
    onSave: async (newActions: ActionDef[]) => {
      settingsManager.settings.actions = newActions;
      await settingsManager.saveSettings();
      // Ensure the editor picks up the new actions
      extensionManager.reconfigure('typst-mate-action');
    },
    onUpdateState: forceUpdate,
  });

  const [filterQuery, setFilterQuery] = useState(settingsManager.settings.settingsStates.actionFilter.query);
  const [activeTriggers, setActiveTriggers] = useState<string[]>(
    settingsManager.settings.settingsStates.actionFilter.triggers || [],
  );
  const [activeActions, setActiveActions] = useState<string[]>(
    settingsManager.settings.settingsStates.actionFilter.actions || [],
  );

  const debouncedSaveQuery = debounce(async (q: string) => {
    settingsManager.settings.settingsStates.actionFilter.query = q;
    await settingsManager.saveSettings();
  }, 150);

  const toggleTriggerFilter = async (type: string) => {
    const newTriggers = activeTriggers.includes(type)
      ? activeTriggers.filter((t) => t !== type)
      : [...activeTriggers, type];
    setActiveTriggers(newTriggers);
    settingsManager.settings.settingsStates.actionFilter.triggers = newTriggers;
    await settingsManager.saveSettings();
  };

  const toggleActionFilter = async (type: string) => {
    const newActions = activeActions.includes(type)
      ? activeActions.filter((a) => a !== type)
      : [...activeActions, type];
    setActiveActions(newActions);
    settingsManager.settings.settingsStates.actionFilter.actions = newActions;
    await settingsManager.saveSettings();
  };

  return (
    <div className="typstmate-action-list-container">
      <div className="typstmate-ext-filter" style={{ marginBottom: 'var(--size-4-2)' }}>
        <input
          type="text"
          placeholder="Filter actions..."
          value={filterQuery}
          onInput={(e) => {
            const val = (e.target as HTMLInputElement).value;
            setFilterQuery(val);
            debouncedSaveQuery(val);
          }}
          className="typstmate-ext-search"
          style={{ width: '100%' }}
        />

        <div className="typstmate-ext-chip-group">
          <span className="typstmate-ext-filter-label">Trigger</span>
          <div className="typstmate-ext-chips">
            {TriggerTypes.map((t) => (
              <button
                key={t}
                className={`typstmate-ext-chip ${activeTriggers.includes(t) ? 'is-active' : ''}`}
                onClick={() => toggleTriggerFilter(t)}
              >
                <span>{t}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="typstmate-ext-chip-group">
          <span className="typstmate-ext-filter-label">Action</span>
          <div className="typstmate-ext-chips">
            {ActionTypes.map((a) => (
              <button
                key={a}
                className={`typstmate-ext-chip ${activeActions.includes(a) ? 'is-active' : ''}`}
                onClick={() => toggleActionFilter(a)}
              >
                <span>{a}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <List
        items={actions.filter((a) => {
          const query = filterQuery.toLowerCase();
          const triggerType = a.trigger.t;
          const triggerValue = a.trigger.v.toLowerCase();

          const actionType = a.action.t;
          const actionValue = a.action.v.toLowerCase();

          // Search query check
          if (
            query &&
            !a.id.toLowerCase().includes(query) &&
            !triggerType.toLowerCase().includes(query) &&
            !triggerValue.includes(query) &&
            !actionType.toLowerCase().includes(query) &&
            !actionValue.includes(query)
          ) {
            return false;
          }

          // Trigger type filter check
          if (activeTriggers.length > 0 && !activeTriggers.includes(triggerType)) {
            return false;
          }

          // Action type filter check
          if (activeActions.length > 0 && !activeActions.includes(actionType)) {
            return false;
          }

          return true;
        })}
        renderItem={(action, _index) => (
          <ActionItem
            key={getSortableUuid(action)}
            uuid={getSortableUuid(action)}
            action={action}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onMove={moveItem}
          />
        )}
      />

      <div className="typstmate-add-button-container" style={{ marginTop: 'var(--size-4-2)' }}>
        <button
          className="typstmate-button is-primary"
          onClick={async () => {
            actions.push({
              id: `new-action-${crypto.randomUUID().slice(0, 8)}`,
              contexts: ['Markdown', 'MathJax', 'Markup', 'Code', 'Math', 'Opaque'],
              trigger: { t: 'type', v: '' },
              action: { t: 'snippet', v: '' },
            });
            await settingsManager.saveSettings();
            forceUpdate();
          }}
        >
          <span>Add action</span>
        </button>
      </div>
    </div>
  );
}
