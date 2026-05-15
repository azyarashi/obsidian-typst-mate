import { proxy, type Remote, wrap } from 'comlink';
import { Notice } from 'obsidian';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { appUtils, features, fileManager, settingsManager, t } from '@/libs';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import { getMain } from './main';
import type WasmAdapter from './worker';
import Wasm from './worker';
import WasmWorker from './worker?worker&inline';

export class WasmManager implements Singleton {
  wasm?: WasmAdapter | Remote<WasmAdapter>;
  private worker?: Worker;

  init(_: ObsidianTypstMate) {}

  async prepareWasmAdapter() {
    const { settings } = settingsManager;

    // * constructor
    const args: ConstructorParameters<typeof Wasm> = [
      fileManager.baseDirPath,
      fileManager.vaultPackagesDirNPath,
      fileManager.localPackagesDirPaths,
      features,
    ];
    const main = getMain();
    if (settings.enableBackgroundRendering) {
      this.worker = new WasmWorker();
      const remote = wrap<typeof WasmAdapter>(this.worker);

      this.wasm = await new remote(...args);
      await this.wasm.setMain(proxy(main));
    } else {
      this.wasm = new Wasm(...args);
      this.wasm.setMain(main);
    }

    // * load wasm file
    await this.wasm.load(await appUtils.app.vault.adapter.readBinary(fileManager.wasmNPath));
  }

  async initWasm() {
    if (!this.wasm) throw '';

    await this.wasm.setOffset(settingsManager.settings.offset);
    await this.wasm.setFontsize(appUtils.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE);
    await this.wasm.initInternalPackages();
  }

  async prepareAssets(files: Map<string, string>) {
    const fontNPaths = await fileManager.collectFonts();
    const fonts = (
      await Promise.all(
        fontNPaths.map((fontNPath) =>
          appUtils.app.vault.adapter.readBinary(fontNPath).catch(() => {
            new Notice(t('notices.failedToLoadFont', { name: fontNPath.split('/').pop() ?? 'undefined' }));
          }),
        ),
      )
    ).filter((font) => font !== undefined);

    await this.wasm!.store({ fonts, files });
  }

  async clearWasm() {
    await this.wasm?.free();
    await this.wasm?.clearCache();
    this.worker?.terminate();

    this.wasm = undefined;
    this.worker = undefined;
  }

  async refreshWasm(files: Map<string, string>) {
    await this.clearWasm();

    await this.prepareWasmAdapter();
    await this.initWasm();
    await this.prepareAssets(files);
  }

  async detach() {
    await this.clearWasm();
  }
}

export const $ = new WasmManager();
