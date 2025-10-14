import type { Processor, ProcessorKind } from '@/libs/processor';
import type { Diagnostic, Result } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';

export default abstract class TypstElement extends HTMLElement {
  kind!: ProcessorKind;
  source!: string;
  processor!: Processor;
  offset!: number;
  autoWidthOffset = 0;

  plugin!: ObsidianTypstMate;

  abstract render(): Promise<TypstElement>;

  abstract format(): string;

  abstract postProcess(result: Result): void;

  abstract handleError(err: Diagnostic[]): void;
}
