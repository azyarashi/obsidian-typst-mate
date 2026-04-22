import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { calculatePopOverPositionByFromAndTo } from '@/editor/shared/utils/position';

import './InlineMathPreview.css';

class InlinePreviewPlugin implements PluginValue {
  container: HTMLElement;
  lastContent: string = '';

  constructor(
    public view: EditorView,
    private enabled: boolean,
    private disableOnMathJax: boolean,
  ) {
    this.container = document.createElement('div');
    this.container.addClasses(['typstmate-inlinemathpreview', 'typstmate-temporary']);
    this.container.hide();

    this.container.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    document.body.appendChild(this.container);
  }

  update(update: ViewUpdate) {
    if (!update.view.hasFocus) {
      this.hide();
      return;
    }

    if (update.docChanged || update.selectionSet) {
      const region = getActiveRegion(update.view);
      if (!region || region.kind !== 'inline') {
        this.hide();
        return;
      }

      const isMathJax = region.processor?.renderingEngine === 'mathjax';
      const showPreview = this.enabled && !(isMathJax && this.disableOnMathJax);

      if (isMathJax && !showPreview) {
        this.hide();
        return;
      }

      if (!showPreview) {
        this.hideContainer();
        return;
      }

      const content = update.state.sliceDoc(region.from, region.to);
      if (content.startsWith('\\ref') || content.startsWith('{} \\ref')) {
        this.hide();
        return;
      }

      if (!this.renderContent(content, region.from + region.skip)) {
        return;
      }

      const isInitialRender = !this.container.isShown();
      if (isInitialRender) {
        this.container.style.opacity = '0';
        this.container.show();
      }

      this.view.requestMeasure({
        read: () => {
          try {
            return calculatePopOverPositionByFromAndTo({
              view: this.view,
              from: region.from,
              to: region.to,
              above: true,
              avoidOverlap: true,
              popOverMaxWidth: this.container.offsetWidth,
              popOverMaxHeight: this.container.offsetHeight,
            });
          } catch {
            return null;
          }
        },
        write: (pos) => {
          if (isInitialRender) {
            this.container.style.opacity = '';
          }
          if (pos) this.applyPosition(pos);
          else this.hide();
        },
      });
    }
  }

  renderContent(content: string, regionFrom: number): boolean {
    if (!window.MathJax) return false;
    if (this.lastContent === content && this.container.isShown()) return true;
    this.lastContent = content;
    this.container.dataset.regionFrom = regionFrom.toString();

    const html = window.MathJax.tex2chtml(content, { display: false });
    this.container.replaceChildren(html);
    return true;
  }

  applyPosition(pos: { x: number; y: number; above: boolean }) {
    this.container.classList.toggle('above', pos.above);
    this.container.style.setProperty('--preview-left', `${pos.x}px`);
    this.container.style.setProperty('--preview-top', `${pos.y}px`);
  }

  hide() {
    this.hideContainer();
    this.lastContent = '';
  }

  /**
   * Hide the container without clearing lastContent to allow background rendering
   */
  hideContainer() {
    this.container.hide();
    this.container.style.opacity = '';
    delete this.container.dataset.regionFrom;
  }

  destroy() {
    this.container.remove();
  }
}

export const inlinePreviewExtension = (enabled: boolean, disableOnMathJax: boolean) =>
  ViewPlugin.define((view) => new InlinePreviewPlugin(view, enabled, disableOnMathJax));
