import type { HtmlEOptions, PdfEOptions, PngEOptions, SvgEOptions } from '@wasm';
import { fileManager, rendererManager } from '@/libs';
import type { VPath } from '@/libs/rendererManager/worker';

export type SvgExportOptions = SvgEOptions & { filenameTemplate: string };
export type PngExportOptions = PngEOptions & { filenameTemplate: string };

export type ExportFormat = 'pdf' | 'png' | 'svg' | 'html';

export async function exportToPdf(vpath: VPath, content: string, options: PdfEOptions): Promise<string | undefined> {
  const result = await rendererManager.wasm.pdfeAsync(vpath, content, options);
  if (!result?.pdf) return;

  const exportPath = fileManager.replaceExtension(vpath, 'pdf');
  await fileManager.writeUint8Array(exportPath, result.pdf);

  return exportPath;
}

export async function exportToPng(vpath: VPath, content: string, options: PngExportOptions) {
  const result = await rendererManager.wasm.pngeAsync(vpath, content, options);
  if (!result?.images) return;

  const total = result.images.length;
  for (let i = 0; i < total; i++) {
    const imageData = result.images[i];
    if (!imageData) continue;

    const exportPath = formatFilename(vpath, options.filenameTemplate, i + 1, total, '.png');
    await fileManager.writeUint8Array(exportPath, imageData);
  }
}

export async function exportToSvg(vpath: VPath, content: string, options: SvgExportOptions) {
  const result = await rendererManager.wasm.svgeAsync(vpath, content, options);
  if (!result?.svgs) return;

  const total = result.svgs.length;
  for (let i = 0; i < total; i++) {
    const svg = result.svgs[i];
    if (!svg) continue;

    const exportPath = formatFilename(vpath, options.filenameTemplate, i + 1, total, '.svg');
    await fileManager.writeString(exportPath, svg);
  }
}

export async function exportToHtml(vpath: VPath, content: string, options: HtmlEOptions) {
  const result = await rendererManager.wasm.htmleAsync(vpath, content, options);
  if (!result?.html) return;

  const html = result.html;
  const exportPath = fileManager.replaceExtension(vpath, 'html');
  await fileManager.writeString(exportPath, html);

  return exportPath;
}

function formatFilename(vpath: VPath, template: string, page: number, total: number, ext: string): string {
  const pageStr = page.toString();
  const totalStr = total.toString();
  const paddedPageStr = pageStr.padStart(totalStr.length, '0');

  let name = template.replace(/{p}/g, pageStr).replace(/{0p}/g, paddedPageStr).replace(/{t}/g, totalStr);
  if (!name.toLowerCase().endsWith(ext)) name += ext;

  return fileManager.join(vpath, name);
}
