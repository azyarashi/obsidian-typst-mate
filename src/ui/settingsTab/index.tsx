import { type TabDefinition, Tabs } from '@components/Tabs';
import { render, useMemo, useState } from 'hono/jsx/dom';
import { type App, PluginSettingTab } from 'obsidian';

import { t } from '@/i18n';
import { settingsManager } from '@/libs';
import type ObsidianTypstMate from '@/main';
import { ActionsTab, AdvancedTab, CompilerTab, ExtensionsTab, ProcessorsTab, RendererTab } from './tabs';

import './index.css';

export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    override plugin: ObsidianTypstMate,
  ) {
    super(app, plugin);
  }

  display() {
    this.containerEl.empty();
    render(<Settings />, this.containerEl);
  }
}

export type Tab = 'processors' | 'actions' | 'extensions' | 'compiler' | 'renderer' | 'advanced';
function Settings() {
  const [activeTab, setActiveTabInternal] = useState<Tab>(settingsManager.settings.settingsStates.tab);

  const setActiveTab = (tab: Tab) => {
    setActiveTabInternal(tab);

    settingsManager.settings.settingsStates.tab = tab;
    settingsManager.saveSettings();
  };

  const tabs = useMemo<TabDefinition<Tab>[]>(
    () => [
      {
        id: 'processors',
        name: t('settings.tabs.processors'),
        renderContent: () => <ProcessorsTab />,
      },
      {
        id: 'actions',
        name: t('settings.tabs.actions'),
        renderContent: () => <ActionsTab />,
      },
      {
        id: 'extensions',
        name: t('settings.tabs.extensions'),
        renderContent: () => <ExtensionsTab />,
      },
      {
        id: 'compiler',
        name: t('settings.tabs.compiler'),
        renderContent: () => <CompilerTab />,
      },
      {
        id: 'renderer',
        name: t('settings.tabs.renderer'),
        renderContent: () => <RendererTab />,
      },
      {
        id: 'advanced',
        name: t('settings.tabs.advanced'),
        renderContent: () => <AdvancedTab />,
      },
    ],
    [],
  );

  return (
    <div class="typstmate-settingstab">
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
