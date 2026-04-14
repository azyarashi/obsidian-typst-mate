import { type App, MarkdownView, type WorkspaceLeaf } from 'obsidian';
import { BASE_COLOR_VAR } from '@/constants';
import ObsidianTypstMate from '@/main';
import { TextFileView, type Tool, TypstFileView, TypstPreviewView, TypstToolsView } from '@/ui/views';
import { settingsManager } from '../settingsManager';
import { typstManager } from '../typstManager';

class AppUtils {
  app!: App;
  restoreThemeProperty: (() => void) | null = null;

  init(plugin: ObsidianTypstMate) {
    this.app = plugin.app;
  }

  async reloadPlugin(openSettingsTab: boolean) {
    const { app } = this;
    const pluginId = ObsidianTypstMate.id;

    await app.plugins.disablePlugin(pluginId); // ? onunload is also called
    await app.plugins.enablePlugin(pluginId); // ? onload is also called
    if (openSettingsTab) app.setting.openTabById(pluginId);
  }

  applyBaseColor(useBaseColor: boolean = false) {
    const { settings } = settingsManager;

    // ? Canvas にも適用するためbodyへの適用が必要
    if (!settings.autoBaseColor || useBaseColor)
      return document.body.style.setProperty(BASE_COLOR_VAR, settings.baseColor);
    else document.body.style.setProperty(BASE_COLOR_VAR, 'currentColor');
  }

  async applyThemeProperty() {
    const target = this.app.vault.config;
    const propertyName = 'theme';
    const originalDescriptor = Object.getOwnPropertyDescriptor(target, propertyName);
    let theme = target[propertyName];
    let applyBaseColor: (() => void) | null = () => settingsManager.settings.autoBaseColor && appUtils.applyBaseColor();

    Object.defineProperty(target, propertyName, {
      configurable: true,
      enumerable: true,
      get() {
        return theme;
      },
      set(v) {
        theme = v;
        requestAnimationFrame(() => applyBaseColor?.());
      },
    });
    this.restoreThemeProperty = () => {
      if (originalDescriptor) Object.defineProperty(target, propertyName, originalDescriptor);
      else {
        delete target[propertyName];
        target[propertyName] = theme;
      }

      applyBaseColor = null;
      this.restoreThemeProperty = null;
    };
  }

  async openTypstTools(active = false, tool?: Tool) {
    let leaf: WorkspaceLeaf | null | undefined;
    [leaf] = this.app.workspace.getLeavesOfType(TypstToolsView.viewtype);
    if (!leaf) leaf = this.app.workspace.getLeftLeaf(false);
    if (!leaf) return; // TODO

    await leaf.setViewState({ type: TypstToolsView.viewtype, active });
    if (active) this.app.workspace.revealLeaf(leaf);
    if (tool) (leaf.view as TypstToolsView).openTool(tool);
  }

  async refreshView(app?: App) {
    this.refreshMarkdownView(app);
    this.refreshTypstView(app);
  }

  async refreshMarkdownView(app?: App) {
    const view = (app ?? this.app).workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    if (view.getMode() === 'preview') view.previewMode.rerender(true);
    else view.leaf.rebuildView();
  }

  async refreshTypstView(app?: App) {
    const types = [TypstFileView.viewtype, TypstPreviewView.viewtype, TypstToolsView.viewtype, TextFileView.viewtype];

    for (const type of types) for (const leaf of (app ?? this.app).workspace.getLeavesOfType(type)) leaf.rebuildView();
  }

  getNoteWidth(): string {
    if (typstManager.currentNoteWidth !== undefined) return typstManager.currentNoteWidth;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    let width = Infinity;

    if (view) {
      const sizer = view?.editor.editorComponent?.sizerEl;
      const sizerWidth = sizer?.clientWidth ? sizer.clientWidth : Infinity;

      if (view.getMode() === 'preview') {
        const divElP = view?.contentEl.find('div.el-p p');

        const pWidth = divElP?.clientWidth ? divElP.clientWidth : Infinity;

        width = Math.min(sizerWidth, pWidth);
      } else {
        const cmLine = sizer?.find('.cm-line');
        const cmContent = sizer?.find('.cm-content');

        const lineWidth = cmLine?.clientWidth ? cmLine.clientWidth : Infinity;
        const contentWidth = cmContent?.clientWidth ? cmContent?.clientWidth : Infinity;

        width = Math.min(sizerWidth, lineWidth, contentWidth);
      }
    } else {
      // TODO: キャンバス とか Kanban とか
    }

    const fileLineWidth = parseInt(getComputedStyle(document.body).getPropertyValue('--file-line-width'), 10);
    const typstWidth = (width === Infinity ? (Number.isNaN(fileLineWidth) ? 700 : fileLineWidth) : width) * 0.75;

    return `${typstWidth}pt`;
  }

  getActiveMarkdownView() {
    return this.app.workspace.getActiveViewOfType(MarkdownView);
  }

  getActiveTypstView() {
    return this.app.workspace.getActiveViewOfType(TypstFileView);
  }

  detach() {
    this.restoreThemeProperty?.();
  }
}

export const appUtils = new AppUtils();
