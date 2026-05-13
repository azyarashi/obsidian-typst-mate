import type { Range } from '@codemirror/state';
import { Decoration, type EditorView, type WidgetType } from '@codemirror/view';
import { around } from 'monkey-around';
import { TFile } from 'obsidian';
import type ObsidianTypstMate from '@/main';

let patched = false;

export async function patchPlugin(plugin: ObsidianTypstMate) {
  const uninstaller = around(Decoration, {
    set(old) {
      if (patched) uninstaller();

      return (of: Range<Decoration> | readonly Range<Decoration>[], sort?: boolean) => {
        console.log(of, sort);
        if (Array.isArray(of) && 0 < of.length) {
          patchWidgetType(plugin, of[0].value.widget);
          return old.call(plugin, of, sort);
        } else return old.call(plugin, of, sort);
      };
    },
  });

  plugin.register(() => {
    if (!patched) uninstaller();
  });

  //const component = new Component();

  //console.log(component, 'component');
  //const view = new MarkdownPreviewView(component);
  //console.log(view);
  // await MarkdownPreviewView.render(plugin.app, '$x + 1$', view.containerEl, '', component);
  //console.log(view.containerEl);
}

export function patchWidgetType(plugin: ObsidianTypstMate, widget: WidgetType) {
  console.log(2);
  if (patched) return;
  if (!widget) return;

  // @ts-expect-error
  const proto = widget.__proto__;

  if ('render' in proto && 'math' in widget) {
    patched = true;

    const renderOrig = proto.render;
    proto.render = function (el: HTMLElement) {
      el.toggleClass('math-block', this.block);
      el.toggleClass('cm-embed-block', this.block);
      const o = el.find('.edit-block-button');
      el.empty();

      try {
        const a = MathJax.tex2chtml(this.math, { display: this.block, file: this.file });
        el.appendChild(a);
      } catch (e) {
        el.appendText(e as any);
      }

      if (o) el.appendChild(o);

      // finishRenderMath();
    };

    const initDOMOrig = proto.initDOM;
    proto.initDOM = function (view: EditorView) {
      // @ts-expect-error
      console.log(view, view.viewState.editorWidth);
      const containerEl = createEl(this.block ? 'div' : 'span', 'math');
      this.containerEl = containerEl;

      if (this.block) {
        containerEl.createEl('br');
        containerEl.createEl('br');
        this.addEditButton(view, containerEl);
      }

      // @ts-expect-error
      for (const p of view.plugins) {
        if (!(p.values?.file instanceof TFile)) continue;
        this.file = p.values?.file;
        break;
      }

      this.hookClickHandler(view, containerEl);
      this.resizeWidget(view, containerEl);
      this.render(containerEl);
      return containerEl;
    };

    plugin.register(() => {
      proto.initDOM = initDOMOrig;
      proto.render = renderOrig;
    });
  }
}

/*
window.MathJax!.tex2chtml = (e: string, r: { display?: boolean; file?: TFile }) => {
      const { display, file } = r;

      // タグ名，クラス名，属性がこれ以外だと認識されないない
      const container = document.createElement('mjx-container');
      container.className = 'Mathjax';
      container.setAttribute('jax', 'CHTML');

      if (!this.ready) {
        container.textContent = e;
        container.addClass('typstmate-pending');
        container.setAttribute('kind', display ? 'display' : 'inline');

        return container;
      }

      const { ndir, npath } = getNDirAndNPath(file);
      return this.render(e, container, display ? 'display' : 'inline', ndir, npath);
    };
    */

/**
 * t.prototype.initDOM = function(e) {
                var t = this.containerEl = createEl(this.block ? "div" : "span", "math");
                return this.block && (t.createEl("br"),
                t.createEl("br"),
                this.addEditButton(e, t)),
                this.hookClickHandler(e, t),
                this.resizeWidget(e, t),
                this.render(t),
                t
            }
 */

/**
 * var t = this;
                bz.then((function() {
                    var n = t
                      , i = n.math
                      , r = n.block;
                    e.toggleClass("math-block", r),
                    e.toggleClass("cm-embed-block", r);
                    var o = e.find(".edit-block-button");
                    e.empty();
                    try {
                        var a = kz(i, r);
                        e.appendChild(a)
                    } catch (t) {
                        e.appendText(i)
                    }
                    o && e.appendChild(o),
                    xz()
                }
                ))
 */

/*
t.prototype.render = function(e) {
                var t = this;
                bz.then((function() {
                    var n = t
                      , i = n.math
                      , r = n.block;
                    e.toggleClass("math-block", r),
                    e.toggleClass("cm-embed-block", r);
                    var o = e.find(".edit-block-button");
                    e.empty();
                    try {
                        var a = kz(i, r);
                        e.appendChild(a)
                    } catch (t) {
                        e.appendText(i)
                    }
                    o && e.appendChild(o),
                    xz()
                }
                ))
            }
            */

/*
 Gz.registerPostProcessor((function(e) {
            var t = e.findAll(".math:not(.is-loaded)");
            if (0 !== t.length)
                return bz.then((function() {
                    for (var e = 0, n = t; e < n.length; e++) {
                        var i = n[e]
                          , r = ic(i.innerHTML);
                        i.empty();
                        try {
                            var o = kz(r, i.classList.contains("math-block"));
                            i.appendChild(o)
                        } catch (e) {
                            i.appendText(r)
                        }
                        i.addClass("is-loaded"),
                        eq.set(i, r)
                    }
                    return xz()
                }
                ))
        }
                */

/*
finishRenderMath
 function xz() {
            return Cz || (Cz = gb()),
            clearTimeout(Ez),
            Ez = window.setTimeout(Sz, 100),
            Cz.promise
        }
*/
