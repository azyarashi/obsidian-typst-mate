import type { PopupPosition } from '@/editor/shared/utils/position';
import type ObsidianTypstMate from '@/main';

import './InlineMathPreview.css';

export default class InlinePreviewElement extends HTMLElement {
  plugin!: ObsidianTypstMate;

  startup(plugin: ObsidianTypstMate) {
    this.plugin = plugin;
    this.addClasses(['typstmate-inline-preview', 'typstmate-temporary']);
    this.hide();
  }

  render(position: PopupPosition, content: string) {
    this.style.setProperty('--preview-left', `${position.x}px`);
    this.style.setProperty('--preview-top', `${position.y}px`);

    if (this.style.display === 'none') this.firstRender();
    this.show();

    const html = window.MathJax!.tex2chtml(content, { display: false });
    this.replaceChildren(html);
  }

  firstRender() {
    this.show();
  }

  close() {
    this.hide();
  }

  onClick(e: MouseEvent) {
    const target = e.targetNode as HTMLElement | null;
    if (!target) return;
    if (!target.classList.contains('cm-math')) this.close();
  }
}
