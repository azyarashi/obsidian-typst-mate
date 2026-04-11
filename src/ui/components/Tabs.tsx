import { Platform } from 'obsidian';
import type { JSX } from 'preact';

import './Tabs.css';

export type TabDefinition<T extends string> = {
  id: T;
  name: string;
  renderContent: () => JSX.Element;
};

interface TabsProps<T extends string> {
  tabs: TabDefinition<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
}

export function Tabs<T extends string>({ tabs, activeTab, onTabChange }: TabsProps<T>) {
  function renderContainer(asSelect: boolean) {
    return asSelect ? (
      <select
        className="typstmate-tabs-select"
        value={activeTab}
        onChange={(e: Event) => onTabChange((e.target as HTMLSelectElement).value as T)}
      >
        {tabs.map((tab) => (
          <option value={tab.id}>{tab.name}</option>
        ))}
      </select>
    ) : (
      <div className="typstmate-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            className={`typstmate-tab ${tab.id === activeTab ? 'active' : ''}`}
            role="tab"
            aria-selected={tab.id === activeTab}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>
    );
  }

  function renderContent(tab: TabDefinition<T> | undefined) {
    return (
      <div className="typstmate-tab-content" role="tabpanel">
        {/* TODO */}
        {tab ? tab.renderContent() : 'something went wrong'}
      </div>
    );
  }

  return (
    <>
      {renderContainer(Platform.isMobileApp)}
      {renderContent(tabs.find((t) => t.id === activeTab))}
    </>
  );
}
