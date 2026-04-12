import { type TabDefinition, Tabs } from '@components/Tabs';
import { useState } from 'preact/hooks';
import { t } from '@/i18n';
import { settingsManager } from '@/libs';
import { FontListContainer, PackagesListContainer } from '@/ui/settingsTab/tabs/compiler/subTabs';

export type CompilerSubTab = 'packages' | 'fonts';

export function CompilerTab() {
  const [activeSubTab, setActiveSubTabInternal] = useState<CompilerSubTab>(
    settingsManager.settings.settingsStates.compilerSubTab,
  );
  const onChangeSubTab = (tab: CompilerSubTab) => {
    setActiveSubTabInternal(tab);
    settingsManager.settings.settingsStates.compilerSubTab = tab;
    settingsManager.saveSettings();
  };

  const subTabs: TabDefinition<CompilerSubTab>[] = [
    {
      id: 'packages',
      name: t('settings.compiler.subTabs.packages'),
      renderContent: () => <PackagesListContainer />,
    },
    {
      id: 'fonts',
      name: t('settings.compiler.subTabs.fonts'),
      renderContent: () => <FontListContainer />,
    },
  ];

  return <Tabs tabs={subTabs} activeTab={activeSubTab} onTabChange={onChangeSubTab} />;
}
