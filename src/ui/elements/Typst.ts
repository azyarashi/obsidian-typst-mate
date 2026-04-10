import { MarkdownView, Menu, type MenuItem, Notice } from 'obsidian';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { updateDiagnosticEffect } from '@/editor/shared/extensions/Diagnostic';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { t } from '@/i18n';
import { appUtils, settingsManager, typstManager } from '@/libs';
import { type Processor, type ProcessorKind, RenderingEngine } from '@/libs/processor';
import type { BaseResult, Diagnostic } from '@/libs/typstManager/worker';
import { DiagnosticModal } from '../modals/diagnostic';

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

  postProcess(result: BaseResult) {
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

  handleError(err: Diagnostic[]) {
    this.isErr = true;
    typstManager.beforeKind = this.kind;

    const view = appUtils.app.workspace.getActiveFileView();
    if (view instanceof MarkdownView)
      setTimeout(() => {
        updateDiagnosticEffect(view.editor.cm, {
          diagnostics: err,
          processor: this.processor,
          noDiag: this.noDiag,
          offset: this.offset,
        });
      }, 0);

    if (view instanceof MarkdownView) {
      const region = getActiveRegion(view.editor.cm);
      if (region) {
        this.innerHTML = this.innerHTML.replaceAll('--typst-base-color', '--text-faint');
        return;
      }
    }
    const diagEl = document.createElement('span');
    diagEl.className = 'typstmate-error';

    diagEl.textContent = `${err[0]?.message}${err[0]?.hints.length !== 0 ? ` ${t('common.hintsCount', { count: err[0]?.hints.length ?? 0 })}` : ''}`;

    if (err[0]?.hints.length !== 0)
      diagEl.addEventListener('click', () => new DiagnosticModal(appUtils.app, err).open());

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
  formatted = (processor.noPreamble ?? false) ? formatted : `${preamble}\n${formatted}`;

  let offset =
    -processor.format.indexOf('{CODE}') -
    ((processor.noPreamble ?? false) ? 0 : preamble.length + 1) -
    typstManager.preamble.length -
    1;

  if (processor.fitToNoteWidth ?? false) {
    const width = appUtils.getNoteWidth();
    formatted = `#let WIDTH = ${width}\n${formatted}`;
    offset -= 14 + width.length;
  }

  return { formatted, offset };
}
