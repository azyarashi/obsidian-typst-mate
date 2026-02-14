import { Notice } from 'obsidian';
import { BASE_COLOR_VAR } from '@/constants';
import type { Diagnostic, SVGResult } from '@/libs/worker';
import TypstElement from './Typst';

export default class TypstSVGElement extends TypstElement {
  override connectedCallback() {
    this.addEventListener('contextmenu', (event) => {
      const svg = this.querySelector('svg');
      if (!svg) return;

      event.preventDefault();
      this.menu.showAtPosition({ x: event.pageX, y: event.pageY });
    });

    this.addEventListener('click', async (event) => {
      if (this.kind !== 'codeblock' && !event.metaKey && !event.ctrlKey) return;
      const svg = this.querySelector('svg');
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (event.clientX - rect.left) / (rect.width / svg.viewBox.baseVal.width);
      const y = (event.clientY - rect.top) / (rect.height / svg.viewBox.baseVal.height);

      await this.plugin.typst.svg(this.format(), this.kind, this.id); // フレーム生成のための副作用
      const result = await this.plugin.typst.jumpFromClick(x, y);
      if (result) this.plugin.editorHelper?.jumpTo(result, this);
    });
  }

  constructor() {
    super();
    this.menu.addSeparator();
    this.menu.addItem((item) => {
      item.setTitle('Copy as SVG (Obsidian Theme)').onClick(async () => {
        if (this.isErr) return;

        const bodyStyles = getComputedStyle(document.body);
        const baseColor = bodyStyles.getPropertyValue('--text-normal').trim();

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor);
        await copySVGToClipboard(svg);

        new Notice('Copied to clipboard!');
      });
    });
    this.menu.addItem((item) => {
      item.setTitle('Copy as SVG (Typst Default)').onClick(async () => {
        if (this.isErr) return;

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, '#000000');
        await copySVGToClipboard(svg);

        new Notice('Copied to clipboard!');
      });
    });
    this.menu.addSeparator();
    this.menu.addItem((item) => {
      item.setTitle('Copy as PNG (Transparent)').onClick(async () => {
        if (this.isErr) return;

        const bodyStyles = getComputedStyle(document.body);
        const baseColor = bodyStyles.getPropertyValue('--text-normal').trim();

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor);
        const pngBlob = await SVGToPNG(svg, this);

        if (pngBlob) {
          await copyPNGToClipboard(pngBlob);
          new Notice('Copied to clipboard!');
        } else new Notice('Failed to convert SVG to PNG');
      });
    });
    this.menu.addItem((item) => {
      item.setTitle('Copy as PNG (Opaque)').onClick(async () => {
        if (this.isErr) return;

        const bodyStyles = getComputedStyle(document.body);
        const baseColor = bodyStyles.getPropertyValue('--text-normal').trim();
        const backgroundColor = bodyStyles.getPropertyValue('--background-primary').trim();

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor);
        const pngBlob = await SVGToPNG(svg, this, backgroundColor);

        if (pngBlob) {
          await copyPNGToClipboard(pngBlob);
          new Notice('Copied to clipboard!');
        } else new Notice('Failed to convert SVG to PNG');
      });
    });
    this.menu.addSeparator();
    this.menu.addItem((item) => {
      item.setTitle('Copy as img tag (for embedding into Obsidian notes)').onClick(async () => {
        if (this.isErr) return;

        const bodyStyles = getComputedStyle(document.body);
        const baseColor = bodyStyles.getPropertyValue('--text-normal').trim();

        const svg = this.innerHTML.replaceAll(`var(${BASE_COLOR_VAR})`, baseColor).replaceAll('\n', '');
        const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        const tag = `<img src="${dataUrl}">`;
        await navigator.clipboard.writeText(tag);

        new Notice('Copied to clipboard!');
      });
    });
  }

  async render() {
    const input = this.format();

    try {
      const result = this.plugin.typst.svg(input, this.kind, this.id);

      if (result instanceof Promise) {
        if (this.kind !== 'inline' && this.processor.fitToParentWidth && !this.source.includes('<br>')) {
          this.noDiag = true;
          this.plugin.observer.register(
            this,
            (entry: ResizeObserverEntry) => {
              const input =
                `#let WIDTH = ${(entry.contentRect.width * 3) / 4}pt\n` +
                this.format().replace('width: auto', 'width: WIDTH');

              const result = this.plugin.typst.svg(input, this.kind, this.id) as Promise<SVGResult>;

              result
                .then((result: SVGResult) => this.postProcess(result))
                .catch((err: Diagnostic[]) => {
                  this.handleError(err);
                });
            },
            300,
          );
        }

        result
          .then((result: SVGResult) => this.postProcess(result))
          .catch((err: Diagnostic[]) => this.handleError(err));
      } else this.postProcess(result);
    } catch (err) {
      this.handleError(err as Diagnostic[]);
    }

    return this;
  }

  override postProcess(result: SVGResult) {
    super.postProcess(result);
    this.innerHTML = result.svg;
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
  const svgChild = svgElement.querySelector('svg') as SVGGraphicsElement | null;
  if (!svgChild) return null;

  let { width, height } = svgChild.getBBox();
  width *= scale;
  height *= scale;

  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

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
