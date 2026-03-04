import { type App, Modal, Notice, Setting, type TFile } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import {
  type ExportFormat,
  exportToPdf,
  exportToPng,
  exportToSvg,
  PDF_STANDARDS,
  type PdfExportOptions,
  type PngExportOptions,
  type SvgExportOptions,
} from '@/utils/export';

export type ExportOptions = {
  format: ExportFormat;
  pdf: PdfExportOptions;
  svg: SvgExportOptions;
  png: PngExportOptions;
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
    contentEl.createEl('h2', { text: 'Export Typst Document' });

    new Setting(contentEl).setName('Format').addDropdown((dropdown) => {
      dropdown
        .addOptions({
          pdf: 'PDF',
          svg: 'SVG',
          png: 'PNG (Image)',
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
        .setButtonText('Export')
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
      contentEl.createEl('h3', { text: 'PDF Options' });

      new Setting(contentEl)
        .setName('Tagged PDF')
        .setDesc('Include accessibility metadata.')
        .addToggle((toggle) => {
          toggle.setValue(this.options.pdf.tagged).onChange((value) => {
            this.options.pdf.tagged = value;
          });
        });

      new Setting(contentEl)
        .setName('Document Identifier')
        .setDesc('A unique identifier for the document.')
        .addText((text) => {
          text
            .setPlaceholder('Optional')
            .setValue(this.options.pdf.ident ?? '')
            .onChange((value) => {
              this.options.pdf.ident = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName('Standard')
        .setDesc('Enforce conformance with a PDF standard.')
        .addDropdown((dropdown) => {
          dropdown
            .addOptions(PDF_STANDARDS)
            .setValue(this.options.pdf.standards[0] ?? '')
            .onChange((value) => {
              this.options.pdf.standards = value ? [value] : [];
            });
        });

      new Setting(contentEl)
        .setName('Custom Timestamp')
        .setDesc('Set a custom creation date/time.')
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
        .setName('Page Ranges')
        .setDesc('Comma separated list of ranges. e.g. 1-3, 5, 7-')
        .addText((text) => {
          text
            .setPlaceholder('e.g. 1-3, 5, 7-')
            .setValue(this.options.pdf.pageRanges ?? '')
            .onChange((value) => {
              this.options.pdf.pageRanges = value || undefined;
            });
        });
    } else if (this.options.format === 'svg') {
      contentEl.createEl('h3', { text: 'SVG Options' });

      new Setting(contentEl)
        .setName('Page Ranges')
        .setDesc('Comma separated list of ranges. e.g. 1-3, 5, 7-')
        .addText((text) => {
          text
            .setPlaceholder('e.g. 1-3, 5, 7-')
            .setValue(this.options.svg.pageRanges ?? '')
            .onChange((value) => {
              this.options.svg.pageRanges = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName('Filename Template')
        .setDesc('Template for page filenames. {p}: page number, {0p}: zero-padded, {t}: total count.')
        .addText((text) => {
          text
            .setPlaceholder('page-{0p}-of-{t}.svg')
            .setValue(this.options.svg.filenameTemplate)
            .onChange((value) => {
              this.options.svg.filenameTemplate = value || '{p}.svg';
            });
        });
    } else if (this.options.format === 'png') {
      contentEl.createEl('h3', { text: 'PNG Options' });

      new Setting(contentEl)
        .setName('PPI')
        .setDesc('Pixels per inch. Higher values produce higher resolution (e.g., 72, 144, 300).')
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
        .setName('Page Ranges')
        .setDesc('Comma separated list of ranges. e.g. 1-3, 5, 7-')
        .addText((text) => {
          text
            .setPlaceholder('e.g. 1-3, 5, 7-')
            .setValue(this.options.png.pageRanges ?? '')
            .onChange((value) => {
              this.options.png.pageRanges = value || undefined;
            });
        });

      new Setting(contentEl)
        .setName('Filename Template')
        .setDesc('Template for page filenames. {p}: page number, {0p}: zero-padded, {t}: total count.')
        .addText((text) => {
          text
            .setPlaceholder('page-{0p}-of-{t}.png')
            .setValue(this.options.png.filenameTemplate)
            .onChange((value) => {
              this.options.png.filenameTemplate = value || '{p}.png';
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
      }
    } catch (e) {
      console.error('Export failed:', e);
      new Notice('Export failed. Check the console for details.');
    }
  }
}
