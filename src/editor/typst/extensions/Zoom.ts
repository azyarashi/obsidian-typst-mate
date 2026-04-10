import type { Extension } from '@codemirror/state';
import { type EditorView, keymap, type PluginValue, ViewPlugin } from '@codemirror/view';

class ZoomPlugin implements PluginValue {
  private fontSize = 16;

  constructor(readonly view: EditorView) {
    this.updateStyle();
    this.view.dom.addEventListener('wheel', this.onWheel, { passive: false });
  }

  destroy() {
    this.view.dom.removeEventListener('wheel', this.onWheel);
  }

  updateStyle() {
    this.view.dom.style.fontSize = `${this.fontSize}px`;
  }

  changeFontSizeBy(delta: number) {
    this.fontSize = Math.max(8, this.fontSize + delta);
    this.updateStyle();
  }

  resetFontSize() {
    this.fontSize = 16;
    this.updateStyle();
  }

  private onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      this.changeFontSizeBy(e.deltaY > 0 ? -1 : 1);
    }
  };
}

const zoomPlugin = ViewPlugin.fromClass(ZoomPlugin);

export const zoomExtension: Extension = [
  zoomPlugin,
  keymap.of([
    {
      key: 'Mod-=',
      run: (view) => {
        const plugin = view.plugin(zoomPlugin);
        if (plugin) {
          plugin.changeFontSizeBy(1);
          return true;
        }
        return false;
      },
    },
    {
      key: 'Mod-+',
      run: (view) => {
        const plugin = view.plugin(zoomPlugin);
        if (plugin) {
          plugin.changeFontSizeBy(1);
          return true;
        }
        return false;
      },
    },
    {
      key: 'Mod--',
      run: (view) => {
        const plugin = view.plugin(zoomPlugin);
        if (plugin) {
          plugin.changeFontSizeBy(-1);
          return true;
        }
        return false;
      },
    },
    {
      key: 'Mod-0',
      run: (view) => {
        const plugin = view.plugin(zoomPlugin);
        if (plugin) {
          plugin.resetFontSize();
          return true;
        }
        return false;
      },
    },
  ]),
];
