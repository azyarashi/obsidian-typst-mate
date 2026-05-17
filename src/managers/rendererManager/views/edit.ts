import type { Range } from '@codemirror/state';
import { Decoration, type EditorView, type WidgetType } from '@codemirror/view';
import { around } from 'monkey-around';
import { debounce, editorInfoField } from 'obsidian';
import { appUtils } from '@/libs';
import type ObsidianTypstMate from '@/main';
import type { RendererManager } from '@/managers/rendererManager';
import type { MathWidgetInstance, MathWidgetInternal } from './types';

let patched = false;

function isRangeDecorationArray(
  value: Range<Decoration> | readonly Range<Decoration>[],
): value is readonly Range<Decoration & { widget: WidgetType | null }>[] {
  return Array.isArray(value);
}

export function hookDecorationForPatchingMathWidget(plugin: ObsidianTypstMate, rendererManager: RendererManager) {
  const uninstaller = around(Decoration, {
    set(old) {
      return (...args: Parameters<typeof Decoration.set>) => {
        if (patched) uninstaller();

        const [of, sort] = args;
        if (isRangeDecorationArray(of)) {
          const widget = of[0]?.value.widget;
          if (widget) patched = tryPatchMathWidget(plugin, widget, rendererManager);
          return old.call(plugin, of, sort);
        } else return old.call(plugin, of, sort);
      };
    },
  });

  plugin.register(uninstaller);
}

function isValidMathWidgetType(widget: WidgetType): widget is MathWidgetInternal & WidgetType {
  return 'render' in widget && 'containerEl' in widget && (widget.containerEl as HTMLElement).hasClass('math');
}

// ! ソースモードが有効の場合は呼ばれない
export function tryPatchMathWidget(
  plugin: ObsidianTypstMate,
  widget: WidgetType,
  rendererManager: RendererManager,
): boolean {
  if (!isValidMathWidgetType(widget)) return false;
  const proto = Object.getPrototypeOf(widget) as MathWidgetInstance;

  function render(widget: MathWidgetInstance) {
    const { math, file, block, containerEl } = widget;

    containerEl.toggleClass('math-block', block);
    containerEl.toggleClass('cm-embed-block', block);
    const editBlockButtonEl = containerEl.find('.edit-block-button');

    try {
      const contentEl = rendererManager.typ2chtml(math, { display: block, file, edit: true });
      containerEl.replaceChildren(contentEl);
    } catch (e) {
      containerEl.appendText(String(e));
    }

    if (editBlockButtonEl) containerEl.appendChild(editBlockButtonEl);
  }
  const renderDebounce = debounce(render, 100);

  const renderOrig = proto.render;
  proto.render = function (containerEl: HTMLElement) {
    render(this);

    // block の場合: ResizeObserver を新しいコンテナに付け替える
    this.resizeObserver?.disconnect();
    if (this.block) {
      this.resizeObserver?.observe(containerEl, { box: 'border-box' });
    }
  };

  const initDOMOrig = proto.initDOM;
  proto.initDOM = function (view: EditorView) {
    const info = view.state.field(editorInfoField);
    this.file = info.file;
    // @ts-expect-error
    this.node = info?.node ?? null;

    if (this.block) {
      this.resizeObserver = new ResizeObserver(([entry]) => {
        const { width } = entry!.contentRect;
        if (width > 0) requestAnimationFrame(() => renderDebounce(this));
      });

      const destroyOrig = view.destroy;
      view.destroy = () => {
        this.resizeObserver?.disconnect();
        destroyOrig.call(view);
      };
    }

    this.containerEl = createEl(this.block ? 'div' : 'span', 'math');
    if (this.block) {
      this.containerEl.createEl('br');
      this.containerEl.createEl('br');
      this.addEditButton(view, this.containerEl);
    }

    this.hookClickHandler(view, this.containerEl);
    this.render(this.containerEl);
    return this.containerEl;
  };

  plugin.register(() => {
    proto.initDOM = initDOMOrig;
    proto.render = renderOrig;
  });

  requestAnimationFrame(rebuildLeaves);
  return true;
}

function rebuildLeaves() {
  appUtils.app.workspace.iterateAllLeaves((leaf) => {
    if (!leaf.containerEl.querySelector('.math')) return;
    leaf.rebuildView();
  });
}
