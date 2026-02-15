import { nanoid } from 'nanoid';
import type { Plugin } from 'obsidian';
import type { ExcalidrawAutomate } from 'obsidian-excalidraw-plugin/docs/API/ExcalidrawAutomate';

import type { ExcalidrawProcessor } from '@/libs/processor';
import type ObsidianTypstMate from '@/main';

export default class ExcalidrawPlugin {
  ea?: ExcalidrawAutomate;
  plugin: ObsidianTypstMate;

  constructor(plugin: ObsidianTypstMate, ep: Plugin) {
    this.plugin = plugin;
    // @ts-expect-error
    this.ea = ep?.ea;
  }

  async addTypst(code: string, processor: ExcalidrawProcessor) {
    if (!this.ea)
      // @ts-expect-error
      this.ea = this.plugin.app.plugins.plugins['obsidian-excalidraw-plugin'].ea as ExcalidrawAutomate;

    this.ea.setView();
    this.ea.clear();

    try {
      code = processor.noPreamble
        ? processor.format.replace('{CODE}', code)
        : `${this.plugin.settings.preamble}\n${processor.format.replace('{CODE}', code)}`;

      const svg = (await this.plugin.typst.svg(code, 'excalidraw', processor.id)).svg;

      const width = parseFloat(svg.match(/width="([\d.]+)pt"/)![1]!);
      const height = parseFloat(svg.match(/height="([\d.]+)pt"/)![1]!);

      const id = nanoid() as FileId;
      const pos = this.ea.getViewLastPointerPosition();
      const dataurl = await this.ea.convertStringToDataURL(svg, 'image/svg+xml');

      this.ea.imagesDict[id] = {
        mimeType: 'image/svg+xml',
        id: id,
        dataURL: dataurl,
        created: Date.now(),
        file: null,
        hasSVGwithBitmap: false,
      };
      this.ea.elementsDict[id] = this.ea.boxedElement(id, 'image', pos.x, pos.y, width, height);
      this.ea.elementsDict[id].fileId = id;
      this.ea.elementsDict[id].scale = [1, 1];

      this.ea.addElementsToView(false, true, true, true);

      return id;
    } catch (error) {
      console.error('Failed to add Typst to Excalidraw:', error);
      throw error;
    }
  }
}

type FileId = string & {
  _brand: 'FileId';
};
