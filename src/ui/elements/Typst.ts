import type { Processor, ProcessorKind } from '@/libs/processor';
import type { Diagnostic, SVGResult } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';
import { DiagnosticModal } from '@/ui/modals/diagnostic';

export default class TypstElement extends HTMLElement {
  kind!: ProcessorKind;
  source!: string;
  processor!: Processor;
  offset!: number;
  autoWidthOffset = 0;

  renderingFormat!: 'svg';

  plugin!: ObsidianTypstMate;

  async render() {
    const input = this.format();

    try {
      const result = this.plugin.typst.svg(input, this.kind, this.processor.id);
      this.autoWidthOffset = 0;
      if (result instanceof Promise) {
        if (this.kind !== 'inline' && this.processor.fitToParentWidth && !this.source.includes('<br>'))
          this.plugin.observer.register(
            this,
            (entry: ResizeObserverEntry) => {
              const widthText = `#let WIDTH = ${(entry.contentRect.width * 3) / 4}pt\n`;
              this.autoWidthOffset = widthText.length + 1;
              const input = widthText + this.format().replace('width: auto', 'width: WIDTH');

              const result = this.plugin.typst.svg(input, this.kind, this.processor.id) as Promise<SVGResult>;

              result
                .then((result: SVGResult) => this.postProcess(result))
                .catch((err: Diagnostic[]) => {
                  this.handleError(err);
                });
            },
            300,
          );

        result
          .then((result: SVGResult) => this.postProcess(result))
          .catch((err: Diagnostic[]) => this.handleError(err));
      } else this.postProcess(result);
    } catch (err) {
      this.handleError(err as Diagnostic[]);
    }

    return this;
  }

  format() {
    let formatted = this.processor.format.replace('{CODE}', this.source);
    formatted = this.processor.noPreamble ? formatted : `${this.plugin.settings.preamble}\n${formatted}`;
    this.plugin.typstManager.beforeCodeIndex =
      (this.processor.noPreamble ? 0 : this.plugin.settings.preamble.length + 1) +
      this.processor.format.indexOf('{CODE}') -
      this.processor.id.length +
      this.offset +
      this.autoWidthOffset;
    console.log(formatted.length, this.plugin.typstManager.beforeCodeIndex);

    if (this.kind === 'display') formatted = formatted.replaceAll('<br>', '\n');

    return formatted;
  }

  postProcess(result: SVGResult) {
    if (this.plugin.settings.failOnWarning && result.diags.length !== 0) throw result.diags;

    const svg = result.svg.replaceAll(
      '#000000',
      this.plugin.settings.autoBaseColor ? this.plugin.baseColor : this.plugin.settings.baseColor,
    );

    this.plugin.typstManager.beforeKind = this.kind;
    this.plugin.typstManager.beforeId = this.processor.id;
    this.plugin.typstManager.beforeContent = svg;
    this.innerHTML = svg;
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

      // TODO: エラー箇所を表示する
      if (err[0]?.hints.length !== 0)
        diagEl.addEventListener('click', () => new DiagnosticModal(this.plugin.app, err).open());

      this.plugin.typstManager.beforeKind = this.kind;
      this.plugin.typstManager.beforeId = this.processor.id;
      this.plugin.typstManager.beforeContent = diagEl.outerHTML;
      this.replaceChildren(diagEl);
    }
  }
}
