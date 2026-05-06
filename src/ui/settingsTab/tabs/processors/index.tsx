import { useMemo, useState } from 'preact/hooks';
import { features, type ProcessorKind, ProcessorKindTokens, settingsManager } from '@/libs';
import { t, tFragment } from '@/libs/i18n';
import { Setting } from '@/ui/components/obsidian/Setting';
import { type TabDefinition, Tabs } from '@/ui/components/Tabs';
import { Preamble } from './preamble';
import { ProcessorsContainer } from './processorListContainer';

export function ProcessorsTab() {
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
          setting.setName(t('settings.processors.name')).setDesc(tFragment('settings.processors.desc'))
        }
      />
      <Preamble />
      <Tabs tabs={tabs} activeTab={effectiveActiveTab} onTabChange={onChangeProcessorKind} />
    </>
  );
}
