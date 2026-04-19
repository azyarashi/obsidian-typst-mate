import { MarkdownView, Menu, type MenuItem, Notice } from 'obsidian';
import type { Diagnostic as WasmDiagnostic } from '@/../pkg/typst_wasm';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { updateDiagnosticEffect } from '@/editor/shared/extensions/Linter/extension';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { t } from '@/i18n';
import { appUtils, settingsManager, typstManager } from '@/libs';
import { type Processor, type ProcessorKind, RenderingEngine } from '@/libs/processor';

import './Typst.css';

export default abstract class TypstElement extends HTMLElement {
  ndir!: string;
  npath?: string;
  kind!: ProcessorKind;
  source!: string;
  processor!: Processor;

  noDiag!: boolean;
  offset: number = 0;

  isErr = true;
  protected isInitialized = false;

  abstract render(): Promise<this>;
  abstract renderSync(): this;

  postProcess(result: { diags: WasmDiagnostic[] }) {
    this.isErr = false;

    // ? キャンバスなどで呼ばれたとき用
    const view = appUtils.app.workspace.getActiveFileView();
    if (view instanceof MarkdownView)
      setTimeout(() => {
        updateDiagnosticEffect(view.editor.cm, {
          diagnostics: result.diags,
          processor: this.processor,
          noDiag: this.noDiag,
          offset: this.offset,
        });
      }, 0);

    typstManager.beforeKind = this.kind;
  }

  format() {
    const { formatted, offset } = format(this.source, this.kind, this.processor);
    this.offset = offset;

    return formatted;
  }

  handleError(diags: WasmDiagnostic[]) {
    typstManager.beforeKind = this.kind;
    if (diags.length === 0) return;
    const diag = diags[0]!;
    this.isErr = true;

    const view = appUtils.app.workspace.getActiveFileView();
    if (view instanceof MarkdownView) {
      setTimeout(() => {
        updateDiagnosticEffect(view.editor.cm, {
          diagnostics: diags,
          processor: this.processor,
          noDiag: this.noDiag,
          offset: this.offset,
        });
      }, 0);
    }
    if (view instanceof MarkdownView) {
      const region = getActiveRegion(view.editor.cm);
      if (region) {
        this.innerHTML = this.innerHTML.replaceAll('--typst-base-color', '--text-faint');
        return;
      }
    }

    const diagEl = document.createElement('span');
    diagEl.className = 'typstmate-element-error typstmate-temporary';
    diagEl.textContent = diag.message;

    this.replaceChildren(diagEl);
  }

  protected onContextMenu(event: MouseEvent) {
    event.preventDefault();

    const menu = new Menu().addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsScript')).onClick(() => {
        const { formatted } = format(this.source, this.kind, this.processor);
        navigator.clipboard.writeText(
          formatted.replaceAll('fontsize', `${(appUtils.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE) / 1.25}pt`),
        );
        new Notice(t('notices.copiedToClipboard'));
      });
    });

    this.additionalMenuItems(menu);

    menu.showAtPosition({ x: event.pageX, y: event.pageY });
  }

  protected additionalMenuItems(_menu: Menu) {}

  connectedCallback() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.addEventListener('contextmenu', (event) => this.onContextMenu(event));
  }
}

export function format(source: string, kind: ProcessorKind, processor: Processor) {
  if (!processor) return { formatted: source, offset: 0 };

  let formatted =
    (processor.useReplaceAll ?? false)
      ? processor.format.replaceAll('{CODE}', source)
      : processor.format.replace('{CODE}', source);

  const { settings } = settingsManager;
  const preamble =
    processor.renderingEngine === RenderingEngine.TypstHTML ? settings.preambleHtml : settings.preambleSvg;

  formatted = `${typstManager.preamble}\n${formatted}${kind === 'inline' && processor.renderingEngine === RenderingEngine.TypstSVG ? '#text(size:0pt)[mnomnomno]' : ''}`;
  const noPreamble = 'noPreamble' in processor ? (processor.noPreamble ?? false) : false;
  formatted = noPreamble ? formatted : `${preamble}\n${formatted}`;

  let offset =
    -processor.format.indexOf('{CODE}') - (noPreamble ? 0 : preamble.length + 1) - typstManager.preamble.length - 1;

  if ('fitToNoteWidth' in processor && processor.fitToNoteWidth) {
    const width = appUtils.getNoteWidth();
    formatted = `#let WIDTH = ${width}\n${formatted}`;
    offset -= 14 + width.length;
  }

  return { formatted, offset };
}
