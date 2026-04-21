import { MarkdownView, type Menu, type MenuItem, Notice } from 'obsidian';
import type { Diagnostic, SvgMResult } from '@/../pkg/typst_wasm';
import { BASE_COLOR_VAR } from '@/constants';
import { jumpFromClickPlugin } from '@/editor/shared/extensions/JumpFromClick';
import { t } from '@/i18n';
import { appUtils, settingsManager, typstManager } from '@/libs';
import { ErrorCode } from '@/libs/typstManager/worker';
import TypstElement from './Typst';

import './SVG.css';

export default class TypstSVGElement extends TypstElement {
  override connectedCallback() {
    if (this.isInitialized) return;

    super.connectedCallback();

    this.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.jump(event);
    });
  }

  protected override onContextMenu(event: MouseEvent) {
    const svg = this.querySelector('svg');
    if (!svg) return;

    super.onContextMenu(event);
  }

  protected override additionalMenuItems(menu: Menu) {
    if (this.isErr) return;

    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsSvgObsidian')).onClick(async () => {
        if (this.isErr) return;

        const styles = getComputedStyle(this);
        const baseColor = styles.color;

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor);
        await copySVGToClipboard(svg);

        new Notice(t('notices.copiedToClipboard'));
      });
    });
    menu.addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsSvgTypst')).onClick(async () => {
        if (this.isErr) return;

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, '#000000');
        await copySVGToClipboard(svg);

        new Notice(t('notices.copiedToClipboard'));
      });
    });
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsPngTransparent')).onClick(async () => {
        if (this.isErr) return;

        const styles = getComputedStyle(this);
        const baseColor = styles.color;

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor);
        const pngBlob = await SVGToPNG(svg, this);

        if (pngBlob) {
          await copyPNGToClipboard(pngBlob);
          new Notice(t('notices.copiedToClipboard'));
        } else new Notice(t('notices.failedToConvertSvgToPng'));
      });
    });
    menu.addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsPngOpaque')).onClick(async () => {
        if (this.isErr) return;

        const styles = getComputedStyle(this);
        const bodyStyles = getComputedStyle(document.body);
        const baseColor = styles.color;
        const backgroundColor = bodyStyles.getPropertyValue('--background-primary').trim();

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor);
        const pngBlob = await SVGToPNG(svg, this, backgroundColor);

        if (pngBlob) {
          await copyPNGToClipboard(pngBlob);
          new Notice(t('notices.copiedToClipboard'));
        } else new Notice(t('notices.failedToConvertSvgToPng'));
      });
    });
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
      item.setTitle(t('contextMenu.copyAsImgTag')).onClick(async () => {
        if (this.isErr) return;

        const styles = getComputedStyle(this);
        const baseColor = styles.color;

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor).replaceAll('\n', '');
        const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        const tag = `<img src="${dataUrl}">`;
        await navigator.clipboard.writeText(tag);

        new Notice(t('notices.copiedToClipboard'));
      });
    });
  }

  async render() {
    const formatted = this.format();

    try {
      // TODO
      const result = await typstManager.wasm.svgmAsync(this.ndir, this.kind, this.id, formatted);
      this.postProcess(result);
    } catch (err) {
      if (err === ErrorCode.Pending) return this;
      this.handleError(err as Diagnostic[]);
    }

    return this;
  }

  renderSync() {
    const formatted = this.format();

    try {
      const result = typstManager.wasm.svgm(this.ndir, this.kind, this.id, formatted);
      if (result instanceof Promise) result.then((r: SvgMResult) => this.postProcess(r));
      else this.postProcess(result);
    } catch (err) {
      this.handleError(err as Diagnostic[]);
    }

    return this;
  }

  override postProcess(result: SvgMResult) {
    super.postProcess(result);
    this.innerHTML = result.svg;
  }

  async jump(event: MouseEvent) {
    const svg = this.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / (rect.width / svg.viewBox.baseVal.width);
    const y = (event.clientY - rect.top) / (rect.height / svg.viewBox.baseVal.height);

    await typstManager.wasm.svgmAsync(this.ndir, this.kind, this.id, this.format()); // フレーム生成のための副作用

    const result = await typstManager.wasm.jumpFromClickAsync(x, y);
    if (result) {
      const view = appUtils.app.workspace.getActiveFileView();
      if (!(view instanceof MarkdownView)) return;
      view.editor.cm.plugin(jumpFromClickPlugin)?.jumpTo(result, event, this);
    }
  }
}

async function copySVGToClipboard(svgContent: string) {
  // ? ClipboardItem.supports は対応していないブラウザのために使わない
  try {
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const txtBlob = new Blob([svgContent], { type: 'text/plain' });

    const item = new ClipboardItem({ 'image/svg+xml': svgBlob, 'text/plain': txtBlob });
    await navigator.clipboard.write([item]);
  } catch {
    navigator.clipboard.writeText(svgContent);
  }
}

async function copyPNGToClipboard(pngBlob: Blob) {
  try {
    const item = new ClipboardItem({ 'image/png': pngBlob });
    await navigator.clipboard.write([item]);
  } catch {
    navigator.clipboard.writeText(pngBlob.toString());
  }
}

async function SVGToPNG(
  svgContent: string,
  svgElement: HTMLElement,
  backgroundColor?: string,
  scale = 2,
): Promise<Blob | null> {
  const svgChild = svgElement.querySelector('svg') as SVGSVGElement | null;
  if (!svgChild) return null;

  const vb = svgChild.viewBox?.baseVal;
  const bbox = svgChild.getBBox();

  const width = (vb && vb.width > 0 ? vb.width : bbox.width || 1) * scale;
  const height = (vb && vb.height > 0 ? vb.height : bbox.height || 1) * scale;

  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);

    const padding = (settingsManager.settings.pngPadding ?? 0) * scale;
    const canvas = document.createElement('canvas');
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, padding, padding, width, height);

    const blob = await canvasToBlob(canvas);
    return blob;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadImage(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();

  return img;
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}
