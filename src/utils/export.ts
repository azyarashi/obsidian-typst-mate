import { Notice, type TFile } from 'obsidian';
import type { PdfrResult, PngrResult, SvgrResult } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';

export const PDF_STANDARDS = {
  '': 'Default (PDF 1.7)',
  '1.4': 'PDF 1.4',
  '1.5': 'PDF 1.5',
  '1.6': 'PDF 1.6',
  '1.7': 'PDF 1.7',
  '2.0': 'PDF 2.0',
  'a-1b': 'PDF/A-1b',
  'a-1a': 'PDF/A-1a',
  'a-2b': 'PDF/A-2b',
  'a-2u': 'PDF/A-2u',
  'a-2a': 'PDF/A-2a',
  'a-3b': 'PDF/A-3b',
  'a-3u': 'PDF/A-3u',
  'a-3a': 'PDF/A-3a',
  'a-4': 'PDF/A-4',
  'a-4f': 'PDF/A-4f',
  'a-4e': 'PDF/A-4e',
  'ua-1': 'PDF/UA-1',
} as const;

export type PdfStandard = keyof typeof PDF_STANDARDS;

export interface PdfExportOptions {
  tagged: boolean;
  ident?: string;
  standards: string[];
  timestamp?: number;
  offset?: number;
  pageRanges?: string;
}

export interface SvgExportOptions {
  pageRanges?: string;
  filenameTemplate: string;
}

export interface PngExportOptions {
  ppi: number;
  pageRanges?: string;
  filenameTemplate: string;
}

export type ExportFormat = 'pdf' | 'svg' | 'png';

export async function exportToPdf(
  plugin: ObsidianTypstMate,
  file: TFile,
  content: string,
  options: PdfExportOptions,
): Promise<string | undefined> {
  const result = (await plugin.typst.pdfr('/', file.name, content, options)) as PdfrResult;
  if (!result?.pdf) return;

  const uint8Array = result.pdf instanceof Uint8Array ? result.pdf : new Uint8Array(result.pdf);
  const buffer = new ArrayBuffer(uint8Array.byteLength);
  new Uint8Array(buffer).set(uint8Array);

  const exportPath = `${file.path.slice(0, -file.extension.length - 1)}.pdf`;
  await plugin.app.vault.adapter.writeBinary(exportPath, buffer);

  new Notice(`Exported to ${exportPath}`);

  return exportPath;
}

export async function exportToSvg(plugin: ObsidianTypstMate, file: TFile, content: string, options: SvgExportOptions) {
  const result = (await plugin.typst.svgr('/', file.name, content, options)) as SvgrResult;
  if (!result?.svgs) return;

  const total = result.svgs.length;
  for (let i = 0; i < total; i++) {
    const svg = result.svgs[i];
    if (!svg) continue;
    const exportPath = formatFilename(file, options.filenameTemplate, i + 1, total, '.svg');
    await plugin.app.vault.adapter.write(exportPath, svg);
  }

  new Notice(`Exported ${total} SVG page(s)`);
}

export async function exportToPng(plugin: ObsidianTypstMate, file: TFile, content: string, options: PngExportOptions) {
  const result = (await plugin.typst.pngr('/', file.name, content, options)) as PngrResult;
  if (!result?.images) return;

  const total = result.images.length;
  for (let i = 0; i < total; i++) {
    const imageData = result.images[i];
    if (!imageData) continue;

    const uint8Array = imageData instanceof Uint8Array ? imageData : new Uint8Array(imageData);
    const buffer = new ArrayBuffer(uint8Array.byteLength);
    new Uint8Array(buffer).set(uint8Array);

    const exportPath = formatFilename(file, options.filenameTemplate, i + 1, total, '.png');
    await plugin.app.vault.adapter.writeBinary(exportPath, buffer);
  }

  new Notice(`Exported ${total} PNG image(s)`);
}

function formatFilename(file: TFile, template: string, p: number, t: number, ext: string): string {
  const pStr = p.toString();
  const tStr = t.toString();
  const zeroPStr = pStr.padStart(tStr.length, '0');
  let name = template.replace(/{p}/g, pStr).replace(/{0p}/g, zeroPStr).replace(/{t}/g, tStr);

  if (!name.toLowerCase().endsWith(ext)) name += ext;

  const parentPath = file.parent?.path;
  if (parentPath && parentPath !== '/') return `${parentPath}/${name}`;
  return name;
}
