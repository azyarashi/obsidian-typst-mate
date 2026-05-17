/** biome-ignore-all lint/style/noRestrictedImports: main */
import { debounce, loadMathJax, Platform, Plugin, renderMath } from 'obsidian';
import { Phase, TypstMate } from './api';
import { markdownExtensionEntries, sharedExtensionEntries, typstExtensionEntries } from './editor';
// biome-ignore format: readability
import { $, applyAllPatches, appUtils, crashTracker, detachAllPatches, editorHelper, extensionManager, fileManager, initI18n, processorManager, registerCommands, registerEvents, registerProtocolHandlers, rendererManager, settingsManager, t, tmActionsManager, watcherManager } from './libs';
// biome-ignore format: readability
import { registerEmbeds, registerViews, removeStatusBarItem, SettingsTab, setStatusBarItem, unregisterEmbeds } from './ui';
import { noticeError, noticeMessage } from './utils/notice';

import './ui/styles';

export default class ObsidianTypstMate extends Plugin {
  static readonly id = 'typst-mate';
  readonly api = TypstMate;

  private hasLoadedInVault: boolean = true;
  private hasLoadedInProcess: boolean = false;
  detaches: (() => Promise<any>)[] = [];

  /* onload */

  /**
   * 1. i18next の読み込み
   * 2. ホットリロード等における
   */
  override async onload() {
    await initI18n();
    await this.waitUntilNotDisabling();

    // * api
    /** {@link ObsidianTypstMate.onFirstLoadInProcess} */
    if (window.TypstMate !== undefined) this.hasLoadedInProcess = true;
    window.TypstMate = TypstMate;

    TypstMate.pluginVersion = this.manifest.version;

    // * settingsManager
    await settingsManager.init(this);
    this.detaches.unshift(() => settingsManager.detach());
    this.detaches.unshift(() => appUtils.refreshView(this.app));

    // * crashTracker
    if (crashTracker.shouldBlockStart) return await this.blockStart();
    else crashTracker.updateCrashStatus(true);

    try {
      // * appUtils
      appUtils.init(this);
      appUtils.applyBaseColor();
      await appUtils.applyThemeProperty();
      this.detaches.unshift(appUtils.detach.bind(appUtils));

      // * statusBarItem
      if (Platform.isDesktopApp) {
        const statusBarItemEl = this.addStatusBarItem();
        setStatusBarItem(statusBarItemEl);
        this.detaches.unshift(async () => removeStatusBarItem(statusBarItemEl));
      }

      // * MathJax
      if (!this.hasLoadedInProcess) await this.onFirstLoadInProcess();

      // * fileManager
      await fileManager.init(this);
      this.detaches.unshift(async () => await fileManager.detach());

      // * settingsTab, views and embeds
      this.addSettingTab(new SettingsTab(this.app, this));

      registerViews(this);

      registerEmbeds(this);
      this.detaches.unshift(async () => unregisterEmbeds(this));

      // * processorManager
      await processorManager.init(this);
      processorManager.registerCodeblockProcessors();
      this.detaches.unshift(async () => processorManager.detach());

      // * rendererManager
      await rendererManager.init(this);
      this.detaches.unshift(() => rendererManager.detach());
      rendererManager.registerOnce(this);

      // * watcherManager
      await watcherManager.init(this);
      this.detaches.unshift(() => watcherManager.detach());

      this.app.workspace.onLayoutReady(() => {
        this.onLayoutReady()
          .then(() => {
            TypstMate.setPhase(Phase.Ready);
            this.finish();
          })
          .catch((e) => {
            TypstMate.setPhase(Phase.Error);
            noticeError(t('notices.initFailed'), { message: 'Plugin.onLayoutReady failed', obj: e });
          })
          .finally(() => {
            appUtils.refreshView(this.app);
          });
      });
    } catch (e) {
      TypstMate.setPhase(Phase.Error);
      noticeError(t('notices.initFailed'), { message: 'Plugin.onload failed', obj: e });
    }
  }

  private async waitUntilNotDisabling() {
    const start = Date.now();

    while (window.TypstMate?.phase === Phase.Disabling) {
      if (10 * 1000 < Date.now() - start) {
        noticeMessage(t('notices.unloadDidNotComplete'));
        TypstMate.setPhase(Phase.Disabled);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 / 24));
    }
  }

  private async blockStart(): Promise<void> {
    noticeMessage(t('notices.crashAutoDisabled'));
    crashTracker.updateCrashStatus(false);
    await this.app.plugins.disablePlugin(ObsidianTypstMate.id);
  }

  private async onFirstLoadInProcess() {
    TypstMate.setPhase(Phase.LoadingMathJax);
    await this.prepareMathJaxOnce();
  }

  private async prepareMathJaxOnce() {
    await loadMathJax();
    if (window.MathJax?.tex2chtml === undefined) this.blockStart();

    renderMath('', false); // ? 副作用 (スタイル) のため
  }

  /* onLayoutReady */

  private async onLayoutReady() {
    // * protocol handlers
    registerProtocolHandlers(this);

    // * fileManager
    await fileManager.tryCreateDirs();

    // * wasm
    TypstMate.setPhase(Phase.InitializingWasm);
    await $.onLayoutReady();
    this.detaches.unshift(async () => delete window.TypstMate!.wasm);

    TypstMate.setPhase(Phase.PreparingAssets);
    await rendererManager.onLayoutReady();

    // * watcher
    await watcherManager.onLayoutReady();

    // * tmActionsManager
    await tmActionsManager.init(this);
    this.detaches.unshift(() => tmActionsManager.detach());

    TypstMate.setPhase(Phase.PreparingExtensions);
    extensionManager.init(this);
    this.detaches.unshift(() => extensionManager.detach());
    const entries = [...sharedExtensionEntries, ...markdownExtensionEntries, ...typstExtensionEntries];
    for (const entry of entries) extensionManager.register(entry);

    // * editorHelper
    TypstMate.setPhase(Phase.RegisteringExtensions);
    editorHelper.init(this);
    this.detaches.unshift(() => editorHelper.detach());

    // * commands & events
    TypstMate.setPhase(Phase.RegisteringCommandsAndEvents);
    registerCommands(this);
    registerEvents(this);
    // detach は不要

    // * patches
    TypstMate.setPhase(Phase.ApplyingPatches);
    await applyAllPatches(this);
    this.detaches.unshift(() => detachAllPatches());

    // * TypstMate API
    TypstMate.wasm = $.wasm;
  }

  /* finish */

  private async finish() {
    crashTracker.updateCrashStatus(false);

    if (!this.hasLoadedInVault) appUtils.openTypstTools(true);
    // TODO pending してた Element や View を更新
  }

  /* onunload */

  /**
   * ! Plugin.disablePlugin 時にも呼ばれる
   */
  override async onunload() {
    TypstMate.setPhase(Phase.Disabling);

    try {
      if (crashTracker.shouldBlockStart) crashTracker.updateCrashStatus(false);

      const renderedEls = document.querySelectorAll('typstmate-svg, typstmate-html');
      for (const el of renderedEls) el.remove();

      for (const detach of this.detaches) await detach();
      this.detaches = [];
    } catch (e) {
      noticeError(t('notices.unloadFailed'), { message: 'Plugin.onunload failed', obj: e });
    }

    TypstMate.setPhase(Phase.Disabled);
  }

  /* onExternalSettingsChange */

  override onExternalSettingsChange = debounce(() => settingsManager.loadSettings(), 1000, true);
}
