import { type App, Modal, Notice, Setting } from 'obsidian';
import type { HtmlEOptions, PdfEOptions } from '@/../pkg/typst_wasm';
import { t, tFragment } from '@/i18n';
import { fileManager, settingsManager, typstManager } from '@/libs';
import type { VPath } from '@/libs/typstManager/worker';
import {
  type ExportFormat,
  exportToHtml,
  exportToPdf,
  exportToPng,
  exportToSvg,
  type PngExportOptions,
  type SvgExportOptions,
} from '@/utils/export';

export type ExportOptions = {
  format: ExportFormat;
  pdf: PdfEOptions;
  svg: SvgExportOptions;
  png: PngExportOptions;
  html: HtmlEOptions;
};

export class ExportToolModal extends Modal {
  private vpath: VPath;
  private content: string;
  options: ExportOptions;

  constructor(app: App, vpath: VPath, content: string) {
    super(app);
    this.vpath = vpath;
    this.content = content;

    const { format, pdfTagged, pdfStandard, pngPpi, htmlExtractBody, svgOverflow } =
      settingsManager.settings.exportStates;
    this.options = {
      format,
      pdf: {
        tagged: pdfTagged,
        standards: pdfStandard ? [pdfStandard] : [],
      },
      svg: {
        filenameTemplate: `${fileManager.getBasename(this.vpath)}_{0p}.svg`,
        overflow: svgOverflow,
      },
      png: {
        filenameTemplate: '{p}.png',
        ppi: pngPpi,
      },
      html: {
        extractBody: htmlExtractBody,
      },
    };

    const baseName = fileManager.getBasename(this.vpath);
    this.options.svg.filenameTemplate = `${baseName}_{0p}.svg`;
    this.options.png.filenameTemplate = `${baseName}_{0p}.png`;
  }

  saveSettings() {
    settingsManager.settings.exportStates.format = this.options.format;
    settingsManager.settings.exportStates.pdfTagged = this.options.pdf.tagged ?? true;
    settingsManager.settings.exportStates.pdfStandard = this.options.pdf.standards[0] ?? '';
    settingsManager.settings.exportStates.pngPpi = this.options.png.ppi;
    settingsManager.settings.exportStates.htmlExtractBody = this.options.html.extractBody ?? true;
    settingsManager.settings.exportStates.svgOverflow = this.options.svg.overflow ?? true;
    settingsManager.saveSettings();
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: t('modals.exportTool.name') });

    new Setting(contentEl).setName(t('modals.exportTool.format.name')).addDropdown((dropdown) => {
      dropdown
        .addOptions({
          pdf: t('modals.exportTool.format.options.pdf'),
          svg: t('modals.exportTool.format.options.svg'),
          png: t('modals.exportTool.format.options.png'),
          html: t('modals.exportTool.format.options.html'),
        })
        .setValue(this.options.format)
        .onChange((value) => {
          this.options.format = value as ExportFormat;
          this.saveSettings();
          this.render();
        });
    });

    this.renderOptions(contentEl);

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText(t('modals.exportTool.buttons.export'))
        .setCta()
        .onClick(async () => {
          await this.export();
          this.close();
        });
    });
  }

  render() {
    this.onOpen();
  }

  renderOptions(contentEl: HTMLElement) {
    if (this.options.format === 'pdf') {
      contentEl.createEl('h3', { text: t('modals.exportTool.pdf.name') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.pdf.tagged.name'))
        .setDesc(tFragment('modals.exportTool.pdf.tagged.desc'))
        .addToggle((toggle) => {
          toggle.setValue(this.options.pdf.tagged).onChange((value) => {
            this.options.pdf.tagged = value;
            this.saveSettings();
          });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.pdf.documentIdentifier.name'))
        .setDesc(tFragment('modals.exportTool.pdf.documentIdentifier.desc'))
        .addText((text) => {
          text
            .setPlaceholder('...')
            .setValue(this.options.pdf.ident ?? '')
            .onChange((value) => {
              this.options.pdf.ident = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.pdf.standards.name'))
        .setDesc(tFragment('modals.exportTool.pdf.standards.desc'))
        .addDropdown(async (dropdown) => {
          const standards: Record<string, string> = await typstManager.wasm.get_pdf_standards();
          dropdown
            .addOptions(standards)
            .setValue(this.options.pdf.standards[0] ?? '')
            .onChange((value) => {
              this.options.pdf.standards = value ? [value] : [];
              this.saveSettings();
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.pdf.customTimestamp.name'))
        .setDesc(tFragment('modals.exportTool.pdf.customTimestamp.desc'))
        .addText((text) => {
          text.inputEl.type = 'datetime-local';
          if (this.options.pdf.timestamp) {
            const date = new Date(this.options.pdf.timestamp * 1000);
            const offset = date.getTimezoneOffset() * 60000;
            const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
            text.setValue(localISOTime);
          }
          text.onChange((value) => {
            if (value) {
              const date = new Date(value);
              this.options.pdf.timestamp = date.getTime() / 1000;
              this.options.pdf.offset = -date.getTimezoneOffset(); // in minutes
            } else {
              this.options.pdf.timestamp = undefined;
              this.options.pdf.offset = undefined;
            }
          });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.common.pageRange.name'))
        .setDesc(tFragment('modals.exportTool.common.pageRange.desc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.common.pageRange.placeholder'))
            .setValue(this.options.pdf.pageRanges ?? '')
            .onChange((value) => {
              this.options.pdf.pageRanges = value || undefined;
            });
        });
    } else if (this.options.format === 'svg') {
      contentEl.createEl('h3', { text: t('modals.exportTool.svg.name') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.common.pageRange.name'))
        .setDesc(tFragment('modals.exportTool.common.pageRange.desc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.common.pageRange.placeholder'))
            .setValue(this.options.svg.pageRanges ?? '')
            .onChange((value) => {
              this.options.svg.pageRanges = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.svg.overflow.name'))
        .setDesc(t('modals.exportTool.svg.overflow.desc'))
        .addToggle((toggle) => {
          toggle.setValue(this.options.svg.overflow ?? true).onChange((value) => {
            this.options.svg.overflow = value;
            this.saveSettings();
          });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.common.output.name'))
        .setDesc(tFragment('modals.exportTool.common.output.desc'))
        .addText((text) => {
          text
            .setPlaceholder('{p}.svg')
            .setValue(this.options.svg.filenameTemplate)
            .onChange((value) => {
              this.options.svg.filenameTemplate = value || '{p}.svg';
            });
        });
    } else if (this.options.format === 'png') {
      contentEl.createEl('h3', { text: t('modals.exportTool.png.name') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.png.ppi.name'))
        .setDesc(tFragment('modals.exportTool.png.ppi.desc'))
        .addText((text) => {
          text.inputEl.type = 'number';
          text
            .setPlaceholder('144')
            .setValue(this.options.png.ppi.toString())
            .onChange((value) => {
              this.options.png.ppi = Number.parseInt(value, 10) || 144;
              this.saveSettings();
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.common.pageRange.name'))
        .setDesc(tFragment('modals.exportTool.common.pageRange.desc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.common.pageRange.placeholder'))
            .setValue(this.options.png.pageRanges ?? '')
            .onChange((value) => {
              this.options.png.pageRanges = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.common.output.name'))
        .setDesc(tFragment('modals.exportTool.common.output.desc'))
        .addText((text) => {
          text
            .setPlaceholder('{p}.png')
            .setValue(this.options.png.filenameTemplate)
            .onChange((value) => {
              this.options.png.filenameTemplate = value || '{p}.png';
            });
        });
    } else if (this.options.format === 'html') {
      contentEl.createEl('h3', { text: t('modals.exportTool.html.name') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.html.extractBody.name'))
        .setDesc(tFragment('modals.exportTool.html.extractBody.desc'))
        .addToggle((toggle) => {
          toggle.setValue(this.options.html.extractBody ?? true).onChange((value) => {
            this.options.html.extractBody = value;
            this.saveSettings();
          });
        });
    }
  }

  async export() {
    try {
      switch (this.options.format) {
        case 'pdf':
          await exportToPdf(this.vpath, this.content, this.options.pdf);
          break;
        case 'svg':
          await exportToSvg(this.vpath, this.content, this.options.svg);
          break;
        case 'png':
          await exportToPng(this.vpath, this.content, this.options.png);
          break;
        case 'html':
          await exportToHtml(this.vpath, this.content, this.options.html);
          break;
      }
    } catch (e) {
      console.error('[TypstMate] ExportTool.export failed:', e);
      new Notice(t('notices.exportFailed'));
    }
  }
}
