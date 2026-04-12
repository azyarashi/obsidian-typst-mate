import { ExtensionListItem } from '@components/List/ListItem/ExtensionListItem';
import { type TabDefinition, Tabs } from '@components/Tabs';
import { debounce } from 'obsidian';
import { useMemo, useState } from 'preact/hooks';
import { extensionManager, settingsManager } from '@/libs';
import { ALL_TAGS, type EditorContext, type ExtensionEntry, type Tag } from '@/libs/extensionManager';

export function ExtensionsTab() {
  const [activeTab, setActiveTabInternal] = useState<EditorContext>(
    settingsManager.settings.settingsStates.extensionContextTab,
  );
  const onChangeTab = (tab: EditorContext) => {
    setActiveTabInternal(tab);
    settingsManager.settings.settingsStates.extensionContextTab = tab;
    settingsManager.saveSettings();
  };

  const subTabs: TabDefinition<EditorContext>[] = [
    {
      id: 'typst',
      name: 'TypstFileView',
      renderContent: () => <ExtensionsContent context="typst" />,
    },
    {
      id: 'markdown',
      name: 'MarkdownView',
      renderContent: () => <ExtensionsContent context="markdown" />,
    },
  ];

  return <Tabs tabs={subTabs} activeTab={activeTab} onTabChange={onChangeTab} />;
}

function ExtensionsContent({ context }: { context: EditorContext }) {
  const [query, setQuery] = useState(settingsManager.settings.settingsStates.extensionFilter.query);
  const [activeTags, setActiveTags] = useState<Tag[]>(settingsManager.settings.settingsStates.extensionFilter.tags);

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

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter((entry) => {
      const { package: pkg } = entry;
      // Filter out extensions that don't apply to the current context
      if (!pkg.scope.includes(context)) return false;
      if (pkg.isHidden) return false;
      if (
        q &&
        !pkg.id.toLowerCase().includes(q) &&
        !pkg.name.toLowerCase().includes(q) &&
        !(typeof pkg.description === 'string' && pkg.description.toLowerCase().includes(q))
      )
        return false;
      if (activeTags.length > 0 && !activeTags.some((t) => pkg.tags.includes(t))) return false;
      return true;
    });
  }, [query, activeTags, context, entries]);

  const normal = filtered
    .filter((e) => !e.package.tags.includes('core'))
    .sort((a, b) => (a.package.displayOrder ?? 0) - (b.package.displayOrder ?? 0));
  const core = filtered
    .filter((e) => e.package.tags.includes('core'))
    .sort((a, b) => (a.package.displayOrder ?? 0) - (b.package.displayOrder ?? 0));

  return (
    <>
      <ExtensionFilter
        query={query}
        setQuery={setQuery}
        debouncedSaveQuery={debouncedSaveQuery}
        activeTags={activeTags}
        toggleTag={toggleTag}
      />
      <ExtensionList normal={normal} core={core} context={context} />
    </>
  );
}

function ExtensionFilter({
  query,
  setQuery,
  debouncedSaveQuery,
  activeTags,
  toggleTag,
}: {
  query: string;
  setQuery: (q: string) => void;
  debouncedSaveQuery: (q: string) => void;
  activeTags: Tag[];
  toggleTag: (tag: Tag) => void;
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
    </div>
  );
}

function ExtensionList({
  normal,
  core,
  context,
}: {
  normal: ExtensionEntry<any>[];
  core: ExtensionEntry<any>[];
  context: EditorContext;
}) {
  return (
    <div className="typstmate-ext-list">
      {normal.length === 0 && core.length === 0 && <p className="typstmate-ext-empty">No extensions match.</p>}

      {normal.map((entry) => (
        <ExtensionListItem key={`${context}-${entry.package.id}`} package={entry.package} context={context} />
      ))}

      {core.length > 0 && (
        <>
          {normal.length > 0 && <div className="typstmate-ext-core-divider" />}
          {core.map((entry) => (
            <ExtensionListItem
              key={`${context}-${entry.package.id}`}
              package={entry.package}
              isCore
              context={context}
            />
          ))}
        </>
      )}
    </div>
  );
}
