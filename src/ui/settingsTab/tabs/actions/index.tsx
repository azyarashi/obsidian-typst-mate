import { useState } from 'preact/hooks';
import { t } from '@/i18n';
import { settingsManager } from '@/libs';
import { type TabDefinition, Tabs } from '@/ui/components/Tabs';
import { ActionCodeTab, ActionSettingsTab } from './subTabs';

export type ActionsSubTab = 'code' | 'settings';

export function ActionsTab() {
  const [activeSubTab, setActiveSubTabInternal] = useState<ActionsSubTab>(
    settingsManager.settings.settingsStates.actionsSubTab,
  );

  const onTabChange = (tab: ActionsSubTab) => {
    setActiveSubTabInternal(tab);
    settingsManager.settings.settingsStates.actionsSubTab = tab;
    settingsManager.saveSettings();
  };

  const tabs: TabDefinition<ActionsSubTab>[] = [
    {
      id: 'code',
      name: t('settings.actions.subTabs.code'),
      renderContent: () => <ActionCodeTab />,
    },
    {
      id: 'settings',
      name: t('settings.actions.subTabs.settings'),
      renderContent: () => <ActionSettingsTab />,
    },
  ];

  return <Tabs tabs={tabs} activeTab={activeSubTab} onTabChange={onTabChange} />;
}
