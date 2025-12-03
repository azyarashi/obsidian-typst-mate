import type { Diagnostic, SVGResult } from '@/libs/worker';
import TypstElement from './Typst';

export default class TypstSVGElement extends TypstElement {
  async render() {
    const input = this.format();

    try {
      const result = this.plugin.typst.svg(input, this.kind, this.processor.id);

      if (result instanceof Promise) {
        if (this.kind !== 'inline' && this.processor.fitToParentWidth && !this.source.includes('<br>'))
          this.plugin.observer.register(
            this,
            (entry: ResizeObserverEntry) => {
              const input =
                `#let WIDTH = ${(entry.contentRect.width * 3) / 4}pt\n` +
                this.format().replace('width: auto', 'width: WIDTH');

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

  override postProcess(result: SVGResult) {
    super.postProcess(result);
    this.innerHTML = result.svg;
  }
}
