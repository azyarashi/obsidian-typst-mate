import { Prec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { debounce, type Editor, Notice } from 'obsidian';
import { t } from '@/i18n';
import type ObsidianTypstMate from '@/main';
import type { Singleton } from '@/types/singleton';
import type TypstSVGElement from '@/ui/elements/SVG';
import { buildExtension as buildSharedExtensions } from '../../editor/markdown/build';
import { getActiveRegion } from '../../editor/shared/utils/core';

import '../../editor/shared/css';
import { collectRegions } from '@/editor/markdown/extensions/MarkdownCore';
import { typstManager } from '../typstManager';

export class EditorHelper implements Singleton {
  init(plugin: ObsidianTypstMate) {
    // 拡張機能をセット
    plugin.registerEditorExtension([Prec.high([...buildSharedExtensions()])]);
  }

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

  refresh = debounce(
    () => {
      const svgs = document.querySelectorAll('typstmate-svg') as NodeListOf<TypstSVGElement> | undefined;
      if (!svgs) return;
      for (const svg of svgs)
        if (svg.processor && 'fitToNoteWidth' in svg.processor && svg.processor.fitToNoteWidth) svg.render();
    },
    100,
    true,
  );

  /* Editor Commands
   * Obsidian LaTeX Suite からの輸入
   */

  boxCurrentEquation(view: EditorView) {
    const region = getActiveRegion(view);
    if (!region) return new Notice(t('notices.noActiveRegion'));

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
    if (!region) return new Notice(t('notices.noActiveRegion'));

    view.dispatch({
      selection: { anchor: region.from + region.skip, head: region.to },
    });
  }

  async replaceTexWithTypst(editor: Editor, view: EditorView) {
    const selection = view.state.selection.main;
    const regions = collectRegions(
      view,
      !selection.empty ? selection.from : undefined,
      !selection.empty ? selection.to : undefined,
    ).filter((region) => region.kind !== 'codeblock');

    if (selection.empty && regions.length === 0) {
      editor.replaceSelection(await typstManager.wasm.latexeq_to_typm(editor.getSelection()));
      return;
    }

    for (const region of regions) {
      const content = view.state.sliceDoc(region.from, region.to);
      const math = await typstManager.wasm.latexeq_to_typm(content);
      const fromPosition = editor.offsetToPos(region.from);
      const toPosition = editor.offsetToPos(region.to);
      editor.replaceRange(math, fromPosition, toPosition);
    }
  }

  detach() {
    const temporaryEls = document.querySelectorAll('.typstmate-temporary');
    for (const el of temporaryEls) el.remove();
  }
}

export const editorHelper = new EditorHelper();
