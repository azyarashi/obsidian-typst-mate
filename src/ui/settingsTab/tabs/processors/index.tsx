import { Setting } from '@components/obsidian/Setting';
import { type TabDefinition, Tabs } from '@components/Tabs';
import { useMemo, useState } from 'preact/hooks';
import { t, tFragment } from '@/i18n';
import { features, settingsManager } from '@/libs';
import { type ProcessorKind, ProcessorKindTokens } from '@/libs/processor';
import { Preamble } from './preamble';
import { ProcessorsContainer } from './processorListContainer';

export function ProcessorsTab() {
  // tabs
  const [activeProcessorKind, setActiveProcessorKindInternal] = useState<ProcessorKind>(
    settingsManager.settings.settingsStates.processorKindTab,
  );

  const tabs = useMemo<TabDefinition<ProcessorKind>[]>(
    () =>
      ProcessorKindTokens.filter((k) => k !== 'excalidraw' || features.excalidraw).map((k) => {
        return {
          id: k,
          name: t(`settings.processors.kindTabs.${k}`),
          renderContent: () => <ProcessorsContainer key={k} kind={k} />,
        };
      }),
    [],
  );

  const effectiveActiveTab = useMemo(() => {
    if (tabs.some((t) => t.id === activeProcessorKind)) return activeProcessorKind;
    return tabs[0]?.id ?? ProcessorKindTokens[0];
  }, [tabs, activeProcessorKind]);

  const onChangeProcessorKind = (tab: ProcessorKind) => {
    setActiveProcessorKindInternal(tab);
    settingsManager.settings.settingsStates.processorKindTab = tab;
    settingsManager.saveSettings();
  };

  return (
    <>
      <Setting
        build={(setting) =>
          setting.setName(t('settings.processors.headerName')).setDesc(tFragment('settings.processors.headerDesc'))
        }
      />
      <Preamble />
      <Tabs tabs={tabs} activeTab={effectiveActiveTab} onTabChange={onChangeProcessorKind} />
    </>
  );
}
