import { MarkdownPreviewRenderer } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { type CodeblockProcessor, type Processor, type ProcessorKind, settingsManager } from '..';
import { t } from '../i18n';
import { getParentNPathByFileNPath } from '../rendererManager/utils';

export * from './processor';

const INTERNAL_CODEBLOCK_IDS: readonly string[] = ['typ', 'typc', 'typm', 'example'].map((id) => `typstmate-${id}`);

export enum RESULT_TYPE {
  SUCCESS,
  WARN,
  ERROR,
}

export class ProcessorManager implements Singleton {
  private plugin!: ObsidianTypstMate;
  private readonly registeredCodeblockProcessorIds: Set<string> = new Set();

  async init(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
  }

  checkProcessors() {
    // inline, display で空idが一番下に存在する。
    // inline, display で空idが一番下に存在する。
  }

  addProcessor<K extends ProcessorKind>(kind: K, processor: Processor<K>) {
    const result = [];
    const isIdDuplicated = settingsManager.settings.processors[kind].some((p) => p.id === processor.id);
    if (isIdDuplicated) result.push(isIdDuplicated);

    switch (kind) {
      case 'inline':
      case 'display':
        settingsManager.settings.processors.inline;
        break;
      case 'codeblock': {
        if (INTERNAL_CODEBLOCK_IDS.includes(processor.id)) return [RESULT_TYPE.ERROR, null];
        break;
      }
    }
  }

  removeProcessor<K extends ProcessorKind>(kind: K, processor: Processor<K>) {
    const result = [];
    const isIdDuplicated = settingsManager.settings.processors[kind].some((p) => p.id === processor.id);
    if (isIdDuplicated) result.push(isIdDuplicated);

    switch (kind) {
      case 'inline':
      case 'display':
        settingsManager.settings.processors.inline;
        break;
      case 'codeblock': {
        if (INTERNAL_CODEBLOCK_IDS.includes(processor.id)) return [RESULT_TYPE.ERROR, null];
        break;
      }
    }
  }

  renameProcessor<K extends ProcessorKind>(kind: K, oldProcessor: Processor<K>, newId: string) {}

  swapProcessor<K extends ProcessorKind>(kind: K, index1: number, index2: number) {}

  // TODO
  private registerCodeblockProcessors() {
    for (const id of this.registeredCodeblockProcessorIds) MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.clear();

    const processors = settingsManager.settings.processors.codeblock;
    for (const processor of processors) this.registerCodeblockProcessor(processor);
  }

  private registerCodeblockProcessor(processor: CodeblockProcessor) {
    try {
      this.plugin.registerMarkdownCodeBlockProcessor(processor.id, (source, el, ctx) => {
        if (!this.ready) {
          el.textContent = source;
          el.addClass('typstmate-pending');
          el.setAttribute('kind', processor.id);

          return Promise.resolve(el as HTMLElement);
        }

        const npath = ctx.sourcePath;
        const ndir = getParentNPathByFileNPath(npath);

        return Promise.resolve(this.render(source, el, processor.id, ndir, npath));
      });

      this.registeredCodeblockProcessorIds.add(processor.id);
    } catch {
      new Notice(t('notices.alreadyRegisteredCodeblock', { id: processor.id }));
    }
  }

  private unregisterCodeblockProcessor(id: string) {
    MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.delete(id);
  }

  private renameCodeblockProcessor(oldId: string, newProcessor: CodeblockProcessor) {
    this.unregisterCodeblockProcessor(oldId);
    this.registerCodeblockProcessor(newProcessor);
  }

  detach(): void | Promise<void> {
    (this as any).plugin = undefined;
  }
}

export const processorManager = new ProcessorManager();
