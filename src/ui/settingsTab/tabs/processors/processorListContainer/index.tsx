import { getSortableUuid, List, useSortableList } from '@components/List/ListContainer';
import { Setting } from '@components/obsidian/Setting';
import { useState } from 'hono/jsx';
import { t, tFragment } from '@/i18n';
import { settingsManager } from '@/libs';
import { DefaultNewProcessor, type Processor, type ProcessorKind, type ProcessorOfKind } from '@/libs/processor';
import { ProcessorItem } from './processorItem';

export function ProcessorsContainer<K extends ProcessorKind>({ kind }: { kind: K }) {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  const processors = settingsManager.settings.processor[kind].processors as ProcessorOfKind<K>[];

  const { updateItem, deleteItem, moveItem } = useSortableList<ProcessorOfKind<K>>({
    items: processors,
    onSave: async (newProcessors) => {
      (settingsManager.settings.processor[kind] as { processors: ProcessorOfKind<K>[] }).processors = newProcessors;
      await settingsManager.saveSettings();
    },
    onUpdateState: forceUpdate,
  });

  const handleAdd = async () => {
    const newProcessor = DefaultNewProcessor[kind] as ProcessorOfKind<K>;
    getSortableUuid(newProcessor as Processor);

    const newProcessors = [newProcessor, ...processors];
    (settingsManager.settings.processor[kind] as { processors: ProcessorOfKind<K>[] }).processors = newProcessors;
    await settingsManager.saveSettings();
    forceUpdate();
  };

  return (
    <>
      <Setting
        build={(setting) =>
          setting
            .setName(tFragment(`settings.processors.${kind}ProcessorName`))
            .setDesc(tFragment(`settings.processors.${kind}ProcessorDesc`))
        }
      />
      <button onClick={handleAdd}>{t('settings.processors.addProcessorButton')}</button>
      <List
        items={processors}
        renderItem={(processor, index) => {
          return (
            <ProcessorItem
              key={`processor-${kind}-${getSortableUuid(processor as Processor)}`}
              uuid={getSortableUuid(processor as Processor)}
              kind={kind}
              processor={processor}
              index={index}
              processors={processors}
              onUpdate={updateItem as any}
              onDelete={deleteItem}
              onMove={moveItem}
            />
          );
        }}
      />
    </>
  );
}
