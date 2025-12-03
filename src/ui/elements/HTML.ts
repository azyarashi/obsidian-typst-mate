import type { Diagnostic, HTMLResult } from '@/libs/worker';
import TypstElement from './Typst';

export default class TypstHTMLElement extends TypstElement {
  async render() {
    const input = this.format();

    try {
      const result = this.plugin.typst.html(input, this.kind, this.processor.id);

      if (result instanceof Promise) {
        result
          .then((result: HTMLResult) => this.postProcess(result))
          .catch((err: Diagnostic[]) => this.handleError(err));
      } else this.postProcess(result);
    } catch (err) {
      this.handleError(err as Diagnostic[]);
    }

    return this;
  }

  override postProcess(result: HTMLResult) {
    super.postProcess(result);
    console.log(result.html);
    this.innerHTML = result.html;
  }
}
