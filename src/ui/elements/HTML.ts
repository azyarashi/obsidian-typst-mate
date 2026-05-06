import type { HtmlMResult } from '@wasm';
import { type Menu, type MenuItem, Notice } from 'obsidian';
import { t } from '@/i18n';
import { rendererManager } from '@/libs';
import TypstElement from './Typst';

import './HTML.css';

export default class TypstHTMLElement extends TypstElement {
  override connectedCallback() {
    if (this.isInitialized) return;

    super.connectedCallback();
  }

  async render() {
    const formatted = this.format();

    try {
      const result = await rendererManager.wasm.htmlmAsync(this.ndir, this.kind, this.id, formatted);
      if (result) this.postProcess(result);
    } catch (err) {
      this.handleError(err as any);
    }

    return this;
  }

  renderSync() {
    const formatted = this.format();

    try {
      const result = rendererManager.wasm.htmlm(this.ndir, this.kind, this.id, formatted);
      if (result instanceof Promise) result.then((r: HtmlMResult) => this.postProcess(r));
      else if (result) this.postProcess(result);
    } catch (err) {
      this.handleError(err as any);
    }

    return this;
  }

  override postProcess(result: HtmlMResult) {
    super.postProcess(result);
    this.innerHTML = result.html;
  }

  protected override additionalMenuItems(menu: Menu) {
    if (this.isErr) return;
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsHtml')).onClick(async () => {
        if (this.isErr) return;
        await navigator.clipboard.writeText(this.innerHTML);
        new Notice(t('notices.copiedToClipboard'));
      });
    });
  }
}
