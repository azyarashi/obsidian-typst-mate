import { Prec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { Notice } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import { buildExtension as buildMarkdownExtensions } from './markdown/extensions/build';
import { buildExtension as buildSharedExtensions } from './shared/extensions/build';
import { getActiveRegion } from './shared/extensions/core/TypstMate';

import './shared/css';

export class EditorHelper {
  plugin: ObsidianTypstMate;
  supportedCodeBlockLangs: Set<string>;

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;

    this.supportedCodeBlockLangs = new Set(
      (this.plugin.settings.processor.codeblock?.processors ?? []).map((p) => p.id),
    );

    // 拡張機能をセット
    this.plugin.registerEditorExtension([Prec.high([[...buildSharedExtensions(this), ...buildMarkdownExtensions()]])]);
  }

  /* utils
   */
  hideAllPopup() {
    // TODO
  }

  triggerRippleEffect(view: EditorView, pos: number) {
    const coords = view.coordsAtPos(pos);
    if (!coords) return;

    const ripple = document.createElement('div');
    ripple.className = 'typstmate-jump-ripple';
    ripple.style.left = `${coords.left}px`;
    ripple.style.top = `${coords.top}px`;
    document.body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 900);
  }

  /* Editor Commands
   * Obsidian LaTeX Suite からの輸入
   */

  boxCurrentEquation(view: EditorView) {
    const region = getActiveRegion(view);
    if (!region) return new Notice('There is no active region');

    const content = view.state.sliceDoc(region.from + region.skip, region.to);

    view.dispatch({
      changes: {
        from: region.from + region.skip,
        to: region.to,
        insert: `${region.kind === 'display' ? ' ' : ''}boxed(${content})`,
      },
      selection: {
        anchor: region.from + region.skip + `boxed(${content})`.length,
      },
    });
  }

  selectCurrentEquation(view: EditorView) {
    const region = getActiveRegion(view);
    if (!region) return new Notice('There is no active region');

    view.dispatch({
      selection: { anchor: region.from + region.skip, head: region.to },
    });
  }
}
