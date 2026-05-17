import type { EditorView, WidgetType } from '@codemirror/view';
import type { TFile } from 'obsidian';
import type { CanvasViewCanvasNode } from 'obsidian-typings';

// * Obsidian Internal Types

export interface MathWidgetInternal {
  start: number;
  end: number;
  math: string;
  block: boolean;
  containerEl: HTMLElement;
  resizeObserver: ResizeObserver;
}

interface MathWidgetProtoInternal {
  /**
   * ```js
   * function t(t, n) {
   *   var i = e.call(this) || this;
   *   return i.math = t,
   *   i.block = n,
   *   i
   * }
   * ```
   */
  new (math: string, block: boolean): MathWidgetInternal;

  /**
   * ```js
   * function(e) {
   *   var t = this.containerEl = createEl(this.block ? "div" : "span", "math");
   *   return this.block && (t.createEl("br"),
   *   t.createEl("br"),
   *   this.addEditButton(e, t)),
   *   this.hookClickHandler(e, t),
   *   this.resizeWidget(e, t),
   *   this.render(t),
   *   t
   * }
   * ```
   */
  initDOM(view: EditorView): HTMLElement;
  /**
   * ```js
   * function(e) {
   *   var t = this;
   *   bz.then((function() {
   *     var n = t
   *       , i = n.math
   *       , r = n.block;
   *     e.toggleClass("math-block", r),
   *     e.toggleClass("cm-embed-block", r);
   *     var o = e.find(".edit-block-button");
   *     e.empty();
   *     try {
   *       var a = kz(i, r);
   *       e.appendChild(a)
   *     } catch (t) {
   *       e.appendText(i)
   *     }
   *     o && e.appendChild(o),
   *     xz()
   *   }
   *   ))
   * }
   * ```
   */
  render(el: HTMLElement): void;
}

interface MathWidgetProtoProtoInternal {
  /**
   * ```js
   * constructor() {
   *   _this = WidgetType.call(this) || this;
   *   _this.start = -1;
   *   _this.end = -1;
   *   return _this;
   * }
   * ```
   */
  new (math: string, block: boolean): MathWidgetInternal;

  /**
   * ```js
   * addEditButton(view, containerEl) {
   *   this.setOwner(view);
   *   const buttonEl = containerEl.createDiv("edit-block-button");
   *   setIcon(buttonEl, "lucide-code-2"),
   *   setTooltip(buttonEl, gm.editor.menu.labelEditBlock()),
   *   buttonEl.addEventListener("click", () => {
   *     this.selectElement(view, containerEl);
   *   })
   * }
   * ```
   */
  addEditButton(view: EditorView, containerEl: HTMLElement): void;
  /**
   * ```js
   * hookClickHandler(view, containerEl) {
   *   this.setOwner(view),
   *   dg(containerEl, (function(i) {
   *     for (var r = i.targetNode, o = view.contentDOM; r && r !== o; ) {
   *       if (r.instanceOf(HTMLElement) && r.matches(".cm-editor, .interactive-child"))
   *       return;
   *       r = r.parentNode
   *     }
   *     t.selectElement(e, n)
   *   }
   *   ))
   * }
   * ```
   */
  hookClickHandler(view: EditorView, containerEl: HTMLElement): void;
  /**
   * ```js
   * function(e, t) {
   *   this.resizeObserver || (this.resizeObserver = new ResizeObserver((function() {
   *     e.requestMeasure()
   *   }
   *   ))),
   *   this.resizeObserver.observe(t, {
   *     box: "border-box"
   *   })
   * }
   * ```
   */
  resizeWidget(view: EditorView): void;
  /**
   * ```js
   * function(e) {
   *   t.widgetOwner.set(e, this)
   * }
   * ```
   */
  setOwner(view: EditorView, node: CanvasViewCanvasNode): void;
  /**
   * ```js
   * function(e, t) {
   *   this.start = e,
   *   this.end = t
   * }
   * ```
   */
  setPos(start: number, end: number): void;
  /**
   * ```js
   * function(e) {
   *   var t = this.containerEl;
   *   return t || (this.containerEl = t = this.initDOM(e)),
   *   t
   * }
   * ```
   */
  toDOM(view: EditorView): HTMLElement;
  /**
   * ```js
   * destroy() {
   *   this.resizeObserver?.disconnect()
   * }
   * ```
   */
  destroy(): void;
  eq(other: MathWidgetInternal): boolean;
}

interface MathWidgetProtoProtoProtoInternal extends WidgetType {
  get editable(): boolean;
  get isHidden(): boolean;

  get noReuse(): true;
  get estimatedHeight(): 50;
}

// *

interface MathWidgetExtended extends MathWidgetInternal {
  file: TFile | null;
  node: CanvasViewCanvasNode | null;
}

export type MathWidgetInstance = MathWidgetProtoProtoProtoInternal &
  MathWidgetExtended &
  MathWidgetProtoInternal &
  MathWidgetProtoProtoInternal;
