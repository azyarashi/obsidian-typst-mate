import { Setting } from '@components/obsidian/Setting';
import { type TabDefinition, Tabs } from '@components/Tabs';
import { useMemo, useState } from 'hono/jsx/dom';
import { t, tFragment } from '@/i18n';
import { settingsManager } from '@/libs';
import { type ProcessorKind, ProcessorKindTokens } from '@/libs/processor';
import { Preamble } from './preamble';
import { ProcessorsContainer } from './processorListContainer';

export function ProcessorsTab() {
  // tabs
  const [activeProcessorKind, setActiveProcessorKindInternal] = useState<ProcessorKind>(
    settingsManager.settings.settingsStates.processorKindTab,
  );
  const onChangeProcessorKind = (tab: ProcessorKind) => {
    setActiveProcessorKindInternal(tab);
    settingsManager.settings.settingsStates.processorKindTab = tab;
    settingsManager.saveSettings();
  };

  const tabs = useMemo<TabDefinition<ProcessorKind>[]>(
    () =>
      ProcessorKindTokens.map((k) => {
        return {
          id: k,
          name: t(`settings.processors.kindTabs.${k}`),
          renderContent: () => <ProcessorsContainer kind={k} />,
        };
      }),
    [],
  );

  return (
    <>
      <Setting
        build={(setting) =>
          setting.setName(t('settings.processors.headerName')).setDesc(tFragment('settings.processors.headerDesc'))
        }
      />
      <Preamble />
      <Tabs tabs={tabs} activeTab={activeProcessorKind} onTabChange={onChangeProcessorKind} />
    </>
  );
}
