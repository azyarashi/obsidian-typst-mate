import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { Platform, setTooltip } from 'obsidian';
import { t } from '@/i18n';
import { getActiveRegion } from '../../utils/core';

import './ClickableLink.css';

const urlRegex = /(?:https?|file):\/\/[^\s"'<>]+/g;

const isMac = Platform.isMacOS;
const modifierName = isMac ? 'cmd' : 'ctrl';

class ClickableLinkPluginValue {
  decorations: DecorationSet = Decoration.none;

  constructor(public view: EditorView) {
    this.updateDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.updateDecorations(update.view);
    }
  }

  private updateDecorations(view: EditorView) {
    const region = getActiveRegion(view);
    if (!region) {
      this.decorations = Decoration.none;
      return;
    }

    const { from, to } = region;
    const text = view.state.sliceDoc(from, to);
    const marks = [];

    urlRegex.lastIndex = 0;
    for (;;) {
      const match = urlRegex.exec(text);
      if (!match) break;

      let url = match[0];
      url = url.replace(/[.,;:!?)]+$/, '');

      const start = from + match.index;
      const end = start + url.length;
      marks.push(
        Decoration.mark({
          class: 'typstmate-link',
          attributes: {
            'data-url': url,
          },
        }).range(start, end),
      );
    }

    this.decorations = Decoration.set(marks, true);
  }
}

export const clickableLinkPlugin = ViewPlugin.fromClass(ClickableLinkPluginValue, {
  decorations: (v) => v.decorations,
  eventHandlers: {
    mousedown(event) {
      const isModifierPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!isModifierPressed) return;

      const target = event.target as HTMLElement;
      const linkEl = target.closest('.typstmate-link') as HTMLElement | null;
      if (!linkEl) return;

      const url = linkEl.getAttribute('data-url');
      if (!url) return;

      event.preventDefault();
      window.open(url, '_blank');
    },
    mouseover(event) {
      const target = event.target as HTMLElement;
      const linkEl = target.closest('.typstmate-link') as HTMLElement | null;

      if (linkEl && !linkEl.dataset.hasTooltip) {
        setTooltip(linkEl, t('settings.extensions.clickableLink.tooltip', { key: modifierName }), {
          delay: 300,
        });
        linkEl.dataset.hasTooltip = 'true';
      }
    },
    keydown(event, view) {
      if ((isMac && event.key === 'Meta') || (!isMac && event.key === 'Control')) {
        view.dom.classList.add('typstmate-modifier-pressed');
      }
    },
    keyup(event, view) {
      if ((isMac && event.key === 'Meta') || (!isMac && event.key === 'Control')) {
        view.dom.classList.remove('typstmate-modifier-pressed');
      }
    },
  },
});

export const clickableLinkExtension = [clickableLinkPlugin];
