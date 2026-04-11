import { ExtensionListItem } from '@components/List/ListItem/ExtensionListItem';
import { debounce } from 'obsidian';
import { useMemo, useState } from 'preact/hooks';
import { extensionManager, settingsManager } from '@/libs';
import { ALL_SCOPES, ALL_TAGS, type EditorContext, type ExtensionEntry, type Tag } from '@/libs/extensionManager';

export function ExtensionsTab() {
  const [query, setQuery] = useState(settingsManager.settings.settingsStates.extensionFilter.query);
  const [activeTags, setActiveTags] = useState<Tag[]>(settingsManager.settings.settingsStates.extensionFilter.tags);
  const [activeScopes, setActiveScopes] = useState<EditorContext[]>(
    settingsManager.settings.settingsStates.extensionFilter.scopes,
  );

  const entries = extensionManager.getEntries();
  const debouncedSaveQuery = useMemo(
    () =>
      debounce(async (q: string) => {
        settingsManager.settings.settingsStates.extensionFilter.query = q;
        await settingsManager.saveSettings();
      }, 150),
    [],
  );

  const toggleTag = async (tag: Tag) => {
    const newTags = activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag];
    setActiveTags(newTags);
    settingsManager.settings.settingsStates.extensionFilter.tags = newTags;
    await settingsManager.saveSettings();
  };

  const toggleScope = async (scope: EditorContext) => {
    const newScopes = activeScopes.includes(scope) ? activeScopes.filter((s) => s !== scope) : [...activeScopes, scope];
    setActiveScopes(newScopes);
    settingsManager.settings.settingsStates.extensionFilter.scopes = newScopes;
    await settingsManager.saveSettings();
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter((entry) => {
      const { info } = entry;
      if (q && !info.name.toLowerCase().includes(q) && !info.description.toLowerCase().includes(q)) return false;
      if (activeTags.length > 0 && !activeTags.some((t) => info.tags.includes(t))) return false;
      if (activeScopes.length > 0 && !activeScopes.some((s) => info.scope.includes(s))) return false;
      return true;
    });
  }, [query, activeTags, activeScopes, entries]);

  const normal = filtered
    .filter((e) => !e.info.tags.includes('core'))
    .sort((a, b) => (a.info.displayOrder ?? 0) - (b.info.displayOrder ?? 0));
  const core = filtered
    .filter((e) => e.info.tags.includes('core'))
    .sort((a, b) => (a.info.displayOrder ?? 0) - (b.info.displayOrder ?? 0));

  return (
    <>
      <ExtensionFilter
        query={query}
        setQuery={setQuery}
        debouncedSaveQuery={debouncedSaveQuery}
        activeTags={activeTags}
        toggleTag={toggleTag}
        activeScopes={activeScopes}
        toggleScope={toggleScope}
      />
      <ExtensionList normal={normal} core={core} />
    </>
  );
}

function ExtensionFilter({
  query,
  setQuery,
  debouncedSaveQuery,
  activeTags,
  toggleTag,
  activeScopes,
  toggleScope,
}: {
  query: string;
  setQuery: (q: string) => void;
  debouncedSaveQuery: (q: string) => void;
  activeTags: Tag[];
  toggleTag: (tag: Tag) => void;
  activeScopes: EditorContext[];
  toggleScope: (scope: EditorContext) => void;
}) {
  return (
    <div className="typstmate-ext-filter">
      <input
        type="text"
        className="typstmate-ext-search"
        placeholder="Search extensions…"
        value={query}
        onInput={(e) => {
          const val = (e.target as HTMLInputElement).value;
          setQuery(val);
          debouncedSaveQuery(val);
        }}
      />

      <div className="typstmate-ext-chip-group">
        <span className="typstmate-ext-filter-label">Tag</span>
        <div className="typstmate-ext-chips">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              className={`typstmate-ext-chip ${activeTags.includes(tag) ? 'is-active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <div className="typstmate-ext-chip-group">
        <span className="typstmate-ext-filter-label">Scope</span>
        <div className="typstmate-ext-chips">
          {ALL_SCOPES.map((scope) => (
            <button
              key={scope}
              className={`typstmate-ext-chip ${activeScopes.includes(scope) ? 'is-active' : ''}`}
              onClick={() => toggleScope(scope)}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExtensionList({ normal, core }: { normal: ExtensionEntry<any>[]; core: ExtensionEntry<any>[] }) {
  return (
    <div className="typstmate-ext-list">
      {normal.length === 0 && core.length === 0 && <p className="typstmate-ext-empty">No extensions match.</p>}

      {normal.map((entry) => (
        <ExtensionListItem key={entry.info.id} info={entry.info} />
      ))}

      {core.length > 0 && (
        <>
          {normal.length > 0 && <div className="typstmate-ext-core-divider" />}
          {core.map((entry) => (
            <ExtensionListItem key={entry.info.id} info={entry.info} isCore />
          ))}
        </>
      )}
    </div>
  );
}
