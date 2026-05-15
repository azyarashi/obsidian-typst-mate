import { MarkdownPreviewRenderer } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { type Processor, type ProcessorKind, settingsManager } from '..';
import { t } from '../i18n';
import { renderManager } from '../rendererManager/render/renderManager';
import { getParentNPathByFileNPath } from '../rendererManager/utils';
import type { CodeblockProcessor } from './processor';

export * from './processor';

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

  addProcessor<K extends ProcessorKind>(kind: K, processor: Processor<K>): [RESULT_TYPE, null] | undefined {
    if (settingsManager.settings.processors[kind].some((p) => p.id === processor.id)) return [RESULT_TYPE.ERROR, null]; // ID 重複

    switch (kind) {
      case 'codeblock':
        settingsManager.settings.processors.codeblock.push(processor as CodeblockProcessor);
        this.registerCodeblockProcessor(processor as CodeblockProcessor);
        break;
      case 'inline':
        settingsManager.settings.processors.inline.push(processor as any);
        break;
      case 'display':
        settingsManager.settings.processors.display.push(processor as any);
        break;
    }
  }

  removeProcessor<K extends ProcessorKind>(kind: K, processor: Processor<K>): [RESULT_TYPE, null] | undefined {
    const arr = settingsManager.settings.processors[kind] as Processor<K>[];
    const idx = arr.findIndex((p) => p.id === processor.id);
    if (idx === -1) return [RESULT_TYPE.ERROR, null];

    arr.splice(idx, 1);
    if (kind === 'codeblock') this.unregisterCodeblockProcessor(processor.id);
  }

  renameProcessor<K extends ProcessorKind>(kind: K, oldId: string, newId: string): [RESULT_TYPE, null] | undefined {
    const arr = settingsManager.settings.processors[kind] as Processor<K>[];
    const processor = arr.find((p) => p.id === oldId);
    if (!processor) return [RESULT_TYPE.ERROR, null];

    processor.id = newId;
    if (kind === 'codeblock') this.renameCodeblockProcessor(oldId, processor as CodeblockProcessor);
  }

  swapProcessor<K extends ProcessorKind>(kind: K, index1: number, index2: number): void {
    const arr = settingsManager.settings.processors[kind] as Processor<K>[];
    if (index1 < 0 || index2 < 0 || index1 >= arr.length || index2 >= arr.length) return;
    [arr[index1], arr[index2]] = [arr[index2]!, arr[index1]!];
  }

  // * コードブロック登録管理

  registerCodeblockProcessors() {
    for (const id of this.registeredCodeblockProcessorIds) MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.clear();

    for (const processor of settingsManager.settings.processors.codeblock) this.registerCodeblockProcessor(processor);
  }

  private registerCodeblockProcessor(processor: CodeblockProcessor) {
    try {
      this.plugin.registerMarkdownCodeBlockProcessor(processor.id, (source, el, ctx) => {
        const npath = ctx.sourcePath;
        const ndir = getParentNPathByFileNPath(npath);
        return Promise.resolve(renderManager.renderCodeblock(source, el, processor.id, ndir, npath));
      });
      this.registeredCodeblockProcessorIds.add(processor.id);
    } catch {
      new Notice(t('notices.alreadyRegisteredCodeblock', { id: processor.id }));
    }
  }

  public unregisterCodeblockProcessor(id: string) {
    MarkdownPreviewRenderer.unregisterCodeBlockPostProcessor(id);
    this.registeredCodeblockProcessorIds.delete(id);
  }

  public renameCodeblockProcessor(oldId: string, newProcessor: CodeblockProcessor) {
    this.unregisterCodeblockProcessor(oldId);
    this.registerCodeblockProcessor(newProcessor);
  }

  detach(): void {
    (this as any).plugin = undefined;
  }
}

export const processorManager = new ProcessorManager();
