import type { Processor, ProcessorKind } from '@/libs/processor';
import type { Diagnostic, HTMLResult, SVGResult } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';
import { DiagnosticModal } from '@/ui/modals/diagnostic';

export default abstract class TypstElement extends HTMLElement {
  kind!: ProcessorKind;
  source!: string;
  processor!: Processor;

  plugin!: ObsidianTypstMate;

  abstract render(): Promise<this>;
  postProcess(result: SVGResult | HTMLResult) {
    if (this.plugin.settings.failOnWarning && result.diags.length !== 0) throw result.diags;

    this.plugin.typstManager.beforeKind = this.kind;
    this.plugin.typstManager.beforeId = this.processor.id;
  }

  format() {
    let formatted = this.processor.format.replace('{CODE}', this.source);
    formatted = this.processor.noPreamble ? formatted : `${this.plugin.settings.preamble}\n${formatted}`;

    if (this.kind === 'display') formatted = formatted.replaceAll('<br>', '\n');

    return formatted;
  }

  handleError(err: Diagnostic[]) {
    if (this.plugin.settings.enableMathjaxFallback) {
      this.replaceChildren(
        this.plugin.originalTex2chtml(this.source, {
          display: this.kind !== 'inline',
        }),
      );
    } else {
      const diagEl = document.createElement('span');
      diagEl.className = 'typstmate-error';

      diagEl.textContent = `${err[0]?.message}${err[0]?.hints.length !== 0 ? ` [${err[0]?.hints.length} hints]` : ''}`;

      if (err[0]?.hints.length !== 0)
        diagEl.addEventListener('click', () => new DiagnosticModal(this.plugin.app, err).open());

      this.plugin.typstManager.beforeKind = this.kind;
      this.plugin.typstManager.beforeId = this.processor.id;
      this.replaceChildren(diagEl);
    }
  }
}
