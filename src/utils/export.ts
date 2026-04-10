import { Notice, type TFile } from 'obsidian';
import { t } from '@/i18n';
import { ctxToNDir, typstManager } from '@/libs/typstManager';
import type { HtmlOptionsSer, PdfOptionsSer, PngOptionsSer, SvgOptionsSer } from '@/libs/typstManager/worker';
import type ObsidianTypstMate from '@/main';

export type SvgExportOptions = SvgOptionsSer & { filenameTemplate: string };
export type PngExportOptions = PngOptionsSer & { filenameTemplate: string };

export type ExportFormat = 'pdf' | 'svg' | 'png' | 'html';

export async function exportToHtml(
  plugin: ObsidianTypstMate,
  file: TFile,
  content: string,
  options: HtmlOptionsSer,
  notice = true,
) {
  const ndir = ctxToNDir(file.path);
  const result = await typstManager.wasm.htmlrAsync(ndir, file.name, content, options);
  if (!result?.html) return;

  const html = result.html;
  const exportPath = `${file.path.slice(0, -file.extension.length - 1)}.html`;
  await plugin.app.vault.adapter.write(exportPath, html);

  if (notice) new Notice(t('notices.exportedTo', { path: exportPath }));

  return exportPath;
}

export async function exportToPdf(
  plugin: ObsidianTypstMate,
  file: TFile,
  content: string,
  options: PdfOptionsSer,
  notice: boolean = true,
): Promise<string | undefined> {
  const ndir = ctxToNDir(file.path);
  const result = await typstManager.wasm.pdfrAsync(ndir, file.name, content, options);
  if (!result?.pdf) return;

  const uint8Array = result.pdf instanceof Uint8Array ? result.pdf : new Uint8Array(result.pdf);
  const buffer = new ArrayBuffer(uint8Array.byteLength);
  new Uint8Array(buffer).set(uint8Array);

  const exportPath = `${file.path.slice(0, -file.extension.length - 1)}.pdf`;
  await plugin.app.vault.adapter.writeBinary(exportPath, buffer);

  if (notice) new Notice(t('notices.exportedTo', { path: exportPath }));

  return exportPath;
}

export async function exportToSvg(plugin: ObsidianTypstMate, file: TFile, content: string, options: SvgExportOptions) {
  const ndir = ctxToNDir(file.path);
  const result = await typstManager.wasm.svgrAsync(ndir, file.name, content, options);
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

export async function exportToPng(plugin: ObsidianTypstMate, file: TFile, content: string, options: PngExportOptions) {
  const ndir = ctxToNDir(file.path);
  const result = await typstManager.wasm.pngrAsync(ndir, file.name, content, options);
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

  new Notice(t('notices.exportedPngImages', { count: total }));
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
