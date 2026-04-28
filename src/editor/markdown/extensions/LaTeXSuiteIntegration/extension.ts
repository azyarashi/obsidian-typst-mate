import { type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { TypstMate } from '@/api';
import { appUtils } from '@/libs';

class LaTeXSuiteIntegrationPlugin implements PluginValue {
  constructor(private enabled: boolean) {}

  update(update: ViewUpdate) {
    if (!this.enabled) return;
    if (!(update.docChanged || update.selectionSet || update.viewportChanged)) return;

    const region = TypstMate.ctx?.region;
    if (!region) return;

    const processor = region.processor;
    if (!processor || processor.renderingEngine === 'mathjax') return;

    const kind = region.kind;
    if (kind !== 'inline' && kind !== 'display') return;

    const latexSuitePluginApi = appUtils.app.plugins.getPlugin('obsidian-latex-suite');
    if (!latexSuitePluginApi) return;

    latexSuitePluginApi.disableMath(update.view);
  }
}

export const latexSuiteIntegrationExtension = (enabled: boolean) =>
  ViewPlugin.define((_) => new LaTeXSuiteIntegrationPlugin(enabled));
