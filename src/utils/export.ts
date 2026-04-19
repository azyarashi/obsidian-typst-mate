import { Notice, type TFile } from 'obsidian';
import { t } from '@/i18n';
import { fileManager } from '@/libs';
import { path } from '@/libs/features';
import { typstManager } from '@/libs/typstManager';
import type ObsidianTypstMate from '@/main';
import type { HtmlEOptions, PdfEOptions, PngEOptions, SvgEOptions } from '../../pkg/typst_wasm';

export type SvgExportOptions = SvgEOptions & { filenameTemplate: string };
export type PngExportOptions = PngEOptions & { filenameTemplate: string };

export type ExportFormat = 'pdf' | 'png' | 'svg' | 'html';

function arrayBufferLikeToArrayBuffer(arrayBufferLike: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  const uint8Array = new Uint8Array(arrayBufferLike);
  const buffer = new ArrayBuffer(uint8Array.byteLength);
  new Uint8Array(buffer).set(uint8Array);
  return buffer;
}

export async function exportToPdf(
  plugin: ObsidianTypstMate,
  file: TFile,
  content: string,
  options: PdfEOptions,
  notice: boolean = true,
): Promise<string | undefined> {
  const fullPath = path ? path.join(fileManager.baseDirPath, file.path) : file.path;
  const result = await typstManager.wasm.pdfeAsync(fullPath, content, options);
  if (!result?.pdf) return;

  const buffer = arrayBufferLikeToArrayBuffer(result.pdf);

  const exportPath = `${file.path.slice(0, -file.extension.length - 1)}.pdf`;
  await plugin.app.vault.adapter.writeBinary(exportPath, buffer);

  if (notice) new Notice(t('notices.exportedTo', { path: exportPath }));

  return exportPath;
}

export async function exportToPng(plugin: ObsidianTypstMate, file: TFile, content: string, options: PngExportOptions) {
  const fullPath = path ? path.join(fileManager.baseDirPath, file.path) : file.path;
  const result = await typstManager.wasm.pngeAsync(fullPath, content, options);
  if (!result?.images) return;

  const total = result.images.length;
  for (let i = 0; i < total; i++) {
    const imageData = result.images[i];
    if (!imageData) continue;

    const buffer = arrayBufferLikeToArrayBuffer(imageData);

    const exportPath = formatFilename(file, options.filenameTemplate, i + 1, total, '.png');
    await plugin.app.vault.adapter.writeBinary(exportPath, buffer);
  }

  new Notice(t('notices.exportedPngImages', { count: total }));
}

export async function exportToSvg(plugin: ObsidianTypstMate, file: TFile, content: string, options: SvgExportOptions) {
  const fullPath = path ? path.join(fileManager.baseDirPath, file.path) : file.path;
  const result = await typstManager.wasm.svgeAsync(fullPath, content, options);
  if (!result?.svgs) return;

  const total = result.svgs.length;
  for (let i = 0; i < total; i++) {
    const svg = result.svgs[i];
    if (!svg) continue;
    const exportPath = formatFilename(file, options.filenameTemplate, i + 1, total, '.svg');
    await plugin.app.vault.adapter.write(exportPath, svg);
  }

  new Notice(t('notices.exportedSvgPages', { count: total }));
}

export async function exportToHtml(
  plugin: ObsidianTypstMate,
  file: TFile,
  content: string,
  options: HtmlEOptions,
  notice = true,
) {
  const fullPath = path ? path.join(fileManager.baseDirPath, file.path) : file.path;
  const result = await typstManager.wasm.htmleAsync(fullPath, content, options);
  if (!result?.html) return;

  const html = result.html;
  const exportPath = `${file.path.slice(0, -file.extension.length - 1)}.html`;
  await plugin.app.vault.adapter.write(exportPath, html);

  if (notice) new Notice(t('notices.exportedTo', { path: exportPath }));

  return exportPath;
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
