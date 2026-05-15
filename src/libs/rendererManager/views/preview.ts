import type { MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { appUtils } from '@/libs';
import { getParentNPathByFileNPath, normalizeDisplayMathCode, renderManager } from '@/libs/rendererManager';

const tc = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

type docId = string;
const viewCache = new Map<docId, MarkdownView | undefined>();

// ! PDF Export では getSectionInfo が常に null
export async function Processor(el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<any> {
  const npath = ctx.sourcePath;
  const ndir = getParentNPathByFileNPath(npath);

  let view: MarkdownView | undefined = viewCache.get(ctx.docId);
  if (!view?._loaded) {
    view = appUtils.app.workspace
      .getLeavesOfType('markdown')
      .find((l) => (l.view as MarkdownView).previewMode.docId === ctx.docId)?.view as MarkdownView | undefined;
    if (view?.previewMode.docId !== ctx.docId) view = undefined;

    viewCache.set(ctx.docId, view);
  }

  const mathEls = el.findAll('.math:not(.is-loaded)');
  for (const mathEl of mathEls) {
    const display = mathEl.hasClass('math-block');
    const text = normalizeDisplayMathCode(
      mathEl.innerHTML.replace(/&(amp|lt|gt|quot);/g, (a) => tc[a as keyof typeof tc]),
    );

    mathEl.empty();

    const containerEl = document.createElement('mjx-container');
    containerEl.className = 'Mathjax';
    containerEl.setAttribute('jax', 'CHTML');

    renderManager.renderMath(text, containerEl, display, ndir, npath);
    mathEl.appendChild(containerEl);

    mathEl.addClass('is-loaded');
    // eq.set
  }
}

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
