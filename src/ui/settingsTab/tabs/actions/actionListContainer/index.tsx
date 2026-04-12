import { getSortableUuid, List, useSortableList } from '@components/List/ListContainer';
import { debounce } from 'obsidian';
import { useState } from 'preact/hooks';
import { appUtils, extensionManager, settingsManager } from '@/libs';
import {
  type Action,
  type ActionContext,
  ActionContexts,
  type ActionType,
  ActionTypes,
  type TriggerType,
  TriggerTypes,
} from '@/libs/action';
import { ActionJsonModal } from '@/ui/modals/actionJson';
import { ActionItem } from './actionItem';

export function ActionListContainer() {
  // Use state to track actions for reliable UI updates
  const [actions, setActions] = useState<Action[]>([...settingsManager.settings.actions]);

  const { updateItem, deleteItem, moveItem } = useSortableList<Action>({
    items: actions,
    onSave: async (newActions: Action[]) => {
      setActions(newActions);
      settingsManager.settings.actions = newActions;
      await settingsManager.saveSettings();
      extensionManager.reconfigure('typst-mate-action');
    },
  });

  const [filterQuery, setFilterQuery] = useState(settingsManager.settings.settingsStates.actionFilter.query);
  const [activeTriggers, setActiveTriggers] = useState<TriggerType[]>(
    settingsManager.settings.settingsStates.actionFilter.triggers || [],
  );
  const [activeActions, setActiveActions] = useState<ActionType[]>(
    settingsManager.settings.settingsStates.actionFilter.actions || [],
  );
  const [activeContexts, setActiveContexts] = useState<ActionContext[]>(
    settingsManager.settings.settingsStates.actionFilter.contexts || [],
  );

  const debouncedSaveQuery = debounce(async (q: string) => {
    settingsManager.settings.settingsStates.actionFilter.query = q;
    await settingsManager.saveSettings();
  }, 150);

  const toggleTriggerFilter = async (type: TriggerType) => {
    const newTriggers = activeTriggers.includes(type)
      ? activeTriggers.filter((t) => t !== type)
      : [...activeTriggers, type];
    setActiveTriggers(newTriggers);
    settingsManager.settings.settingsStates.actionFilter.triggers = newTriggers;
    await settingsManager.saveSettings();
  };

  const toggleActionFilter = async (type: ActionType) => {
    const newActions = activeActions.includes(type)
      ? activeActions.filter((a) => a !== type)
      : [...activeActions, type];
    setActiveActions(newActions);
    settingsManager.settings.settingsStates.actionFilter.actions = newActions;
    await settingsManager.saveSettings();
  };

  const toggleContextFilter = async (type: ActionContext) => {
    const newContexts = activeContexts.includes(type)
      ? activeContexts.filter((c) => c !== type)
      : [...activeContexts, type];
    setActiveContexts(newContexts);
    settingsManager.settings.settingsStates.actionFilter.contexts = newContexts;
    await settingsManager.saveSettings();
  };

  const filteredActions = actions.filter((a) => {
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
    if (activeTriggers.length > 0 && !activeTriggers.includes(triggerType)) return false;

    // Action type filter check
    if (activeActions.length > 0 && !activeActions.includes(actionType)) return false;

    // Context filter check
    if (activeContexts.length > 0) {
      const hasAnyContext = a.contexts.some((c) => activeContexts.includes(c));
      if (!hasAnyContext) return false;
    }

    return true;
  });

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

        <div className="typstmate-ext-chip-group">
          <span className="typstmate-ext-filter-label">Context</span>
          <div className="typstmate-ext-chips">
            {ActionContexts.map((c) => (
              <button
                key={c}
                className={`typstmate-ext-chip ${activeContexts.includes(c) ? 'is-active' : ''}`}
                onClick={() => toggleContextFilter(c)}
              >
                <span>{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <List
        items={filteredActions}
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

      <div
        className="typstmate-add-button-container"
        style={{ marginTop: 'var(--size-4-2)', display: 'flex', gap: 'var(--size-4-2)' }}
      >
        <button
          className="typstmate-button is-primary"
          onClick={async () => {
            const newAction: Action = {
              id: `new-action-${Math.random().toString(36).slice(2, 10)}`,
              contexts: ['Markdown', 'MathJax', 'Markup', 'Code', 'Math', 'Opaque'],
              trigger: { t: 'type', v: '' },
              action: { t: 'snippet', v: '' },
            };
            const newActions = [...actions, newAction];
            setActions(newActions);
            settingsManager.settings.actions = newActions;
            await settingsManager.saveSettings();
            extensionManager.reconfigure('typst-mate-action');
          }}
        >
          <span>Add action</span>
        </button>

        <button
          className="typstmate-button"
          onClick={() => {
            new ActionJsonModal(appUtils.app, settingsManager.settings.actions, async (newActions) => {
              setActions(newActions);
              settingsManager.settings.actions = newActions;
              await settingsManager.saveSettings();
              extensionManager.reconfigure('typst-mate-action');
            }).open();
          }}
        >
          <span>Edit JSON</span>
        </button>
      </div>
    </div>
  );
}
