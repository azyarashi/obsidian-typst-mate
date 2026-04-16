import { debounce, loadMathJax, Notice, Platform, Plugin, renderMath } from 'obsidian';
import { initI18n, t } from '@/i18n';
import { Status, TypstMate } from './api';
import { markdownExtensionEntries, sharedExtensionEntries, typstExtensionEntries } from './editor';
// biome-ignore format: 可読性のため
import { appUtils, crashTracker, editorHelper, extensionManager, fileManager, registerCommands, registerEvents, registerProtocolHandlers, settingsManager, typstManager } from './libs';
import { buildTypstMiniEditorExtensions } from './libs/editorHelper/miniEditor';
import { applyAllPatches, detachAllPatches } from './libs/patches';
import { hideStatusBarItem, registerEmbeds, registerViews, SettingsTab, setStatusBarItem } from './ui';

import './ui/styles';

export default class ObsidianTypstMate extends Plugin {
  static readonly id = 'typst-mate';

  private hasLoaded: boolean = true;
  private hasLoadedInProcess: boolean = false;
  private detaches: (() => any | Promise<any>)[] = [];

  /* onload */

  override async onload() {
    await initI18n();
    await this.waitUntilNotDisabling();

    // * settingsManager & crashTracker
    await settingsManager.init(this);
    this.detaches.unshift(async () => await settingsManager.detach());
    this.detaches.unshift(() => appUtils.refreshView(this.app));

    if (crashTracker.shouldBlockStart) return await this.blockStart();
    else crashTracker.updateCrashStatus(true);

    if (window.TypstMate !== undefined) this.hasLoadedInProcess = true;
    TypstMate.version = this.manifest.version;

    try {
      // * appUtils
      appUtils.init(this);
      appUtils.applyBaseColor();
      this.detaches.unshift(() => appUtils.detach());

      // * statusBarItem
      /** @see https://docs.obsidian.md/Plugins/User+interface/Status+bar */
      if (Platform.isDesktopApp) {
        const statusBarItemEl = this.addStatusBarItem();
        setStatusBarItem(statusBarItemEl);
        this.detaches.unshift(() => hideStatusBarItem(statusBarItemEl));
      }

      // * MathJax
      if (!this.hasLoadedInProcess) await this.onFirstLoadInProcess();
      else TypstMate.tex2chtml = window.MathJax.tex2chtml;
      window.TypstMate = TypstMate;
      this.detaches.unshift(() => {
        window.MathJax!.tex2chtml = TypstMate.tex2chtml!;
      });

      // * fileManager
      await fileManager.init(this);
      this.detaches.unshift(async () => await fileManager.detach());

      // * views & embeds
      this.addSettingTab(new SettingsTab(this.app, this));
      // detach は不要

      registerProtocolHandlers(this);
      // detach は不要

      registerViews(this);
      // detach は不要

      registerEmbeds(this);
      this.detaches.unshift(() => this.app.embedRegistry.unregisterExtension('typ'));

      // * typstManager
      await typstManager.init(this);
      this.detaches.unshift(async () => await typstManager.detach());
      typstManager.registerOnce();

      this.app.workspace.onLayoutReady(() => {
        this.onLayoutReady()
          .then(() => {
            TypstMate.update(Status.Ready);
            if (!this.hasLoaded) appUtils.openTypstTools(true);
          })
          .catch((e) => {
            console.error('[TypstMate] Plugin.onLayoutReady failed', e);
            new Notice(t('notices.initFailed'));
            TypstMate.update(Status.Error);
          })
          .finally(() => {
            appUtils.refreshView(this.app);
          });
      });
    } catch (e) {
      console.error('[TypstMate] Plugin.onload failed', e);
      new Notice(t('notices.initFailed'));
      TypstMate.update(Status.Error);
    }
  }

  private async waitUntilNotDisabling() {
    const start = Date.now();

    while (window.TypstMate?.status === Status.Disabling) {
      if (10000 < Date.now() - start) throw new Error('[TypstMate] The plugin did not unload properly last time.');
      await new Promise((resolve) => setTimeout(resolve, 1000 / 60));
    }
  }

  private async blockStart(): Promise<void> {
    new Notice(t('notices.crashAutoDisabled'));
    crashTracker.updateCrashStatus(false);
    await this.app.plugins.disablePlugin(ObsidianTypstMate.id);
  }

  private async onFirstLoadInProcess() {
    TypstMate.update(Status.LoadingMathJax);
    await this.prepareMathJaxOnce();
  }

  private async prepareMathJaxOnce() {
    await loadMathJax();
    if (window.MathJax?.tex2chtml === undefined) this.blockStart();
    renderMath('', false); // ? 副作用 (スタイル) のため
    TypstMate.tex2chtml = window.MathJax.tex2chtml;
  }

  /* onLayoutReady */

  private async onLayoutReady() {
    const list = await fileManager.adapter.list(fileManager.pluginDirNPath);
    if (list.folders.length === 0) this.hasLoaded = false;

    // * fileManager
    await fileManager.ensureWasm(list.files);
    await fileManager.tryCreateDirs();

    // * wasm
    TypstMate.update(Status.InitializingWasm);
    await typstManager.prepareWasm();
    this.detaches.unshift(() => delete window.TypstMate!.wasm);

    TypstMate.update(Status.PreparingAssets);
    await typstManager.prepareAssets();

    // * extensionManager
    TypstMate.update(Status.PreparingExtensions);
    extensionManager.init(this);
    this.detaches.unshift(() => extensionManager.detach());
    const entries = [...sharedExtensionEntries, ...markdownExtensionEntries, ...typstExtensionEntries];
    for (const entry of entries) extensionManager.register(entry);

    extensionManager.registerSettingsEditorFactory(() => buildTypstMiniEditorExtensions());

    // * editorHelper
    TypstMate.update(Status.RegisteringExtensions);
    editorHelper.init(this);
    this.detaches.unshift(() => editorHelper.detach());

    // * commands & events
    TypstMate.update(Status.RegisteringCommandsAndEvents);
    registerCommands(this);
    registerEvents(this);
    // detach は不要

    // * patches
    TypstMate.update(Status.ApplyingPatches);
    applyAllPatches(this);
    this.detaches.unshift(() => detachAllPatches());

    // * TypstMate API
    TypstMate.wasm = typstManager.wasm;
    crashTracker.updateCrashStatus(false);
  }

  /* onunload */

  /**
   * ! Plugin.disablePlugin 時にも呼ばれる
   */
  override async onunload() {
    TypstMate.update(Status.Disabling);
    try {
      if (crashTracker.shouldBlockStart) crashTracker.updateCrashStatus(false);

      const renderedEls = document.querySelectorAll('typstmate-svg, typstmate-html');
      for (const el of renderedEls) el.remove();

      for (const detach of this.detaches) await detach();
      this.detaches = [];
    } catch (e) {
      console.error('[TypstMate] Plugin.onunload failed', e);
      new Notice(t('notices.unloadFailed'));
    }
    TypstMate.update(Status.Disabled);
  }

  /* onExternalSettingsChange */

  override onExternalSettingsChange = debounce(() => settingsManager.loadSettings(), 1000, true);
}
