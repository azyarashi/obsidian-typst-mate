import { debounce } from 'obsidian';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { t, tFragment } from '@/i18n';
import { checkPluginFeatures, features, rendererManager, settingsManager } from '@/libs';
import {
  type CodeblockProcessor,
  DefaultNewProcessor,
  type Processor,
  type ProcessorKind,
  type ProcessorOfKind,
} from '@/libs/processor';
import { getSortableUuid, List, useSortableList } from '@/ui/components/List/ListContainer';
import { Setting } from '@/ui/components/obsidian/Setting';
import { ProcessorItem } from './processorItem';

export function ProcessorsContainer<K extends ProcessorKind>({ kind }: { kind: K }) {
  const [isFlickeringPluginEnabled, setIsFlickeringPluginEnabled] = useState(features.noMoreFlickeringInlineMath);

  useEffect(() => {
    checkPluginFeatures();
    setIsFlickeringPluginEnabled(features.noMoreFlickeringInlineMath);
  }, []);

  const [processors, setProcessors] = useState<ProcessorOfKind<K>[]>([
    ...settingsManager.settings.processor[kind].processors,
  ] as ProcessorOfKind<K>[]);

  const debouncedRename = useMemo(
    () =>
      debounce((oldId: string, newProcessor: CodeblockProcessor) => {
        rendererManager.renameCodeblockProcessor(oldId, newProcessor);
      }, 500),
    [],
  );

  const { updateItem, deleteItem, moveItem } = useSortableList<ProcessorOfKind<K>>({
    items: processors,
    onSave: async (newProcessors) => {
      setProcessors(newProcessors);
      (settingsManager.settings.processor[kind] as { processors: ProcessorOfKind<K>[] }).processors = newProcessors;
      await settingsManager.saveSettings();
    },
  });

  const handleUpdate = async (uuid: string, partial: Partial<ProcessorOfKind<K>>) => {
    if (kind === 'codeblock' && 'id' in partial && partial.id !== undefined) {
      const oldProcessor = processors.find((p) => getSortableUuid(p as Processor) === uuid) as CodeblockProcessor;
      if (oldProcessor && oldProcessor.id !== partial.id) {
        debouncedRename(oldProcessor.id, { ...oldProcessor, ...partial } as CodeblockProcessor);
      }
    }
    await updateItem(uuid, partial);
  };

  const handleDelete = async (uuid: string) => {
    if (kind === 'codeblock') {
      const processor = processors.find((p) => getSortableUuid(p as Processor) === uuid) as CodeblockProcessor;
      if (processor) rendererManager.unregisterCodeblockProcessor(processor.id);
    }
    await deleteItem(uuid);
  };

  const handleAdd = async () => {
    const newProcessor = { ...(DefaultNewProcessor[kind] as ProcessorOfKind<K>) };
    const newProcessors = [newProcessor, ...processors];

    setProcessors(newProcessors);
    (settingsManager.settings.processor[kind] as { processors: ProcessorOfKind<K>[] }).processors = newProcessors;
    await settingsManager.saveSettings();
  };

  return (
    <>
      <Setting
        build={(setting) => {
          const desc = tFragment(`settings.processors.${kind}ProcessorDesc`);
          if (kind === 'inline' && !isFlickeringPluginEnabled) {
            desc.appendChild(tFragment(`settings.processors.inlineProcessorDescExtra`));
          }

          setting.setName(tFragment(`settings.processors.${kind}ProcessorName`)).setDesc(desc);
        }}
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
              onUpdate={handleUpdate as any}
              onDelete={handleDelete}
              onMove={moveItem}
            />
          );
        }}
      />
    </>
  );
}
