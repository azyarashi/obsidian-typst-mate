import { type App, Modal, Notice, Setting, type TFile } from 'obsidian';
import { t } from '@/i18n';
import { typstManager } from '@/libs';
import type { HtmlOptionsSer, PdfOptionsSer } from '@/libs/typstManager/worker';
import type ObsidianTypstMate from '@/main';
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
  pdf: PdfOptionsSer;
  svg: SvgExportOptions;
  png: PngExportOptions;
  html: HtmlOptionsSer;
};

export class ExportToolModal extends Modal {
  plugin: ObsidianTypstMate;
  file: TFile;
  content: string;

  options: ExportOptions = {
    format: 'pdf',
    pdf: {
      tagged: true,
      standards: [],
    },
    svg: {
      filenameTemplate: '{p}.svg',
    },
    png: {
      filenameTemplate: '{p}.png',
      ppi: 288,
    },
    html: {
      extractBody: true,
    },
  };

  constructor(app: App, plugin: ObsidianTypstMate, file: TFile, content: string) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.content = content;

    const baseName = this.file.name.slice(0, this.file.name.lastIndexOf('.'));
    this.options.svg.filenameTemplate = `${baseName}_{0p}.svg`;
    this.options.png.filenameTemplate = `${baseName}_{0p}.png`;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: t('modals.exportTool.heading') });

    new Setting(contentEl).setName(t('modals.exportTool.format')).addDropdown((dropdown) => {
      dropdown
        .addOptions({
          pdf: t('modals.exportTool.formatOptions.pdf'),
          svg: t('modals.exportTool.formatOptions.svg'),
          png: t('modals.exportTool.formatOptions.png'),
          html: t('modals.exportTool.formatOptions.html'),
        })
        .setValue(this.options.format)
        .onChange((value) => {
          this.options.format = value as ExportFormat;
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
      contentEl.createEl('h3', { text: t('modals.exportTool.pdfOptions') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.taggedPdf'))
        .setDesc(t('modals.exportTool.taggedPdfDesc'))
        .addToggle((toggle) => {
          toggle.setValue(this.options.pdf.tagged).onChange((value) => {
            this.options.pdf.tagged = value;
          });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.documentIdentifier'))
        .setDesc(t('modals.exportTool.documentIdentifierDesc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.optionalPlaceholder'))
            .setValue(this.options.pdf.ident ?? '')
            .onChange((value) => {
              this.options.pdf.ident = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.standard'))
        .setDesc(t('modals.exportTool.standardDesc'))
        .addDropdown(async (dropdown) => {
          const standards: Record<string, string> = await typstManager.wasm.get_pdf_standards();
          dropdown
            .addOptions(standards)
            .setValue(this.options.pdf.standards[0] ?? '')
            .onChange((value) => {
              this.options.pdf.standards = value ? [value] : [];
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.customTimestamp'))
        .setDesc(t('modals.exportTool.customTimestampDesc'))
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
        .setName(t('modals.exportTool.pageRanges'))
        .setDesc(t('modals.exportTool.pageRangesDesc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.pageRangesPlaceholder'))
            .setValue(this.options.pdf.pageRanges ?? '')
            .onChange((value) => {
              this.options.pdf.pageRanges = value || undefined;
            });
        });
    } else if (this.options.format === 'svg') {
      contentEl.createEl('h3', { text: t('modals.exportTool.svgOptions') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.pageRanges'))
        .setDesc(t('modals.exportTool.pageRangesDesc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.pageRangesPlaceholder'))
            .setValue(this.options.svg.pageRanges ?? '')
            .onChange((value) => {
              this.options.svg.pageRanges = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.filenameTemplate'))
        .setDesc(t('modals.exportTool.filenameTemplateDesc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.filenameTemplateDefaults.svg'))
            .setValue(this.options.svg.filenameTemplate)
            .onChange((value) => {
              this.options.svg.filenameTemplate = value || '{p}.svg';
            });
        });
    } else if (this.options.format === 'png') {
      contentEl.createEl('h3', { text: t('modals.exportTool.pngOptions') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.ppi'))
        .setDesc(t('modals.exportTool.ppiDesc'))
        .addText((text) => {
          text.inputEl.type = 'number';
          text
            .setPlaceholder('144')
            .setValue(this.options.png.ppi.toString())
            .onChange((value) => {
              this.options.png.ppi = Number.parseInt(value, 10) || 144;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.pageRanges'))
        .setDesc(t('modals.exportTool.pageRangesDesc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.pageRangesPlaceholder'))
            .setValue(this.options.png.pageRanges ?? '')
            .onChange((value) => {
              this.options.png.pageRanges = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName(t('modals.exportTool.filenameTemplate'))
        .setDesc(t('modals.exportTool.filenameTemplateDesc'))
        .addText((text) => {
          text
            .setPlaceholder(t('modals.exportTool.filenameTemplateDefaults.png'))
            .setValue(this.options.png.filenameTemplate)
            .onChange((value) => {
              this.options.png.filenameTemplate = value || '{p}.png';
            });
        });
    } else if (this.options.format === 'html') {
      contentEl.createEl('h3', { text: t('modals.exportTool.htmlOptions') });

      new Setting(contentEl)
        .setName(t('modals.exportTool.extractBody'))
        .setDesc(t('modals.exportTool.extractBodyDesc'))
        .addToggle((toggle) => {
          toggle.setValue(this.options.html.extractBody ?? true).onChange((value) => {
            this.options.html.extractBody = value;
          });
        });
    }
  }

  async export() {
    try {
      switch (this.options.format) {
        case 'pdf':
          await exportToPdf(this.plugin, this.file, this.content, this.options.pdf);
          break;
        case 'svg':
          await exportToSvg(this.plugin, this.file, this.content, this.options.svg);
          break;
        case 'png':
          await exportToPng(this.plugin, this.file, this.content, this.options.png);
          break;
        case 'html':
          await exportToHtml(this.plugin, this.file, this.content, this.options.html);
          break;
      }
    } catch (e) {
      console.error('Export failed:', e);
      new Notice(t('notices.exportFailed'));
    }
  }
}
