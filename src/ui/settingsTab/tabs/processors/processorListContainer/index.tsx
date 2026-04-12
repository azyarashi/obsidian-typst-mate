import { getSortableUuid, List, useSortableList } from '@components/List/ListContainer';
import { Setting } from '@components/obsidian/Setting';
import { useState } from 'preact/hooks';
import { t, tFragment } from '@/i18n';
import { settingsManager } from '@/libs';
import { DefaultNewProcessor, type Processor, type ProcessorKind, type ProcessorOfKind } from '@/libs/processor';
import { ProcessorItem } from './processorItem';

export function ProcessorsContainer<K extends ProcessorKind>({ kind }: { kind: K }) {
  // Use state to track processors for reliable UI updates
  const [processors, setProcessors] = useState<ProcessorOfKind<K>[]>([
    ...settingsManager.settings.processor[kind].processors,
  ] as ProcessorOfKind<K>[]);

  const { updateItem, deleteItem, moveItem } = useSortableList<ProcessorOfKind<K>>({
    items: processors,
    onSave: async (newProcessors) => {
      setProcessors(newProcessors);
      (settingsManager.settings.processor[kind] as { processors: ProcessorOfKind<K>[] }).processors = newProcessors;
      await settingsManager.saveSettings();
    },
  });

  const handleAdd = async () => {
    // Spread DefaultNewProcessor to avoid mutating the original template
    const newProcessor = { ...(DefaultNewProcessor[kind] as ProcessorOfKind<K>) };
    const newProcessors = [newProcessor, ...processors];

    setProcessors(newProcessors);
    (settingsManager.settings.processor[kind] as { processors: ProcessorOfKind<K>[] }).processors = newProcessors;
    await settingsManager.saveSettings();
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
      <button className="typstmate-button is-primary" onClick={handleAdd} style={{ marginBottom: 'var(--size-4-2)' }}>
        {t('settings.processors.addProcessorButton')}
      </button>
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
