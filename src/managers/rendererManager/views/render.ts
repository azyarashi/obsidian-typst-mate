import type { MarkdownPostProcessorContext, TFile } from 'obsidian';
import { appUtils } from '@/libs';
import { getNDirAndNPath, getParentNPathByFileNPath, normalizeDisplayMathCode } from '@/managers/rendererManager/utils';
import { rendererManager } from '..';

export type Typ2chtmlOptions = {
  display?: boolean;
  file?: TFile | null;
  edit?: boolean;
};

const TC = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' } as const;

function createMathContainer(): HTMLElement {
  const el = document.createElement('mjx-container');
  el.className = 'Mathjax';
  el.setAttribute('jax', 'CHTML');
  return el;
}

// * typ2chtml — WASM 準備前後でスワップ

/** WASM 準備前のプレースホルダー。pending リストに積んでおく */
const pendings: { containerEl: HTMLElement; math: string; options: Typ2chtmlOptions }[] = [];

export function typ2chtmlBeforeReady(math: string, options: Typ2chtmlOptions = {}): HTMLElement {
  const containerEl = createMathContainer();
  containerEl.textContent = math;
  containerEl.addClass('typstmate-pending');
  containerEl.setAttribute('kind', options.display ? 'display' : 'inline');
  pendings.push({ containerEl, math, options });
  return containerEl;
}

export function typ2chtml(math: string, options: Typ2chtmlOptions = {}): HTMLElement {
  const { display, file } = options;

  const metadata = file ? appUtils.app.metadataCache.getCache(file.path) : undefined;
  if (metadata?.frontmatter?.['math-engine'] === 'mathjax') return MathJax.tex2chtml(math, { display });

  const containerEl = createMathContainer();
  const { ndir, npath } = getNDirAndNPath(file);
  return rendererManager.renderMath(math, containerEl, display ?? false, ndir, npath);
}

/**
 * WASM が ready になった後に呼ぶ。
 * pending に積まれた要素を実際にレンダリングして差し替える。
 */
export function flushPendings(renderFn: typeof typ2chtml) {
  for (const { containerEl, math, options } of pendings) {
    if (!containerEl.isConnected) continue;
    containerEl.removeClass('typstmate-pending');
    const rendered = renderFn(math, options);
    containerEl.replaceWith(rendered);
  }
  pendings.length = 0;
}

// * Markdown Post Processor — WASM 準備前後でスワップ

export function markdownProcessorBeforeReady(el: HTMLElement, _ctx: MarkdownPostProcessorContext) {
  for (const mathEl of el.querySelectorAll('.math:not(.is-loaded)')) {
    const display = mathEl.hasClass('math-block');
    const text = mathEl.textContent!;
    mathEl.empty();

    const containerEl = createMathContainer();
    containerEl.textContent = text;
    containerEl.addClass('typstmate-pending');
    containerEl.setAttribute('kind', display ? 'display' : 'inline');

    mathEl.appendChild(containerEl);
    mathEl.setAttribute('contenteditable', 'false');
    mathEl.addClass('is-loaded');
  }
}

export function markdownProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const npath = ctx.sourcePath;
  const ndir = getParentNPathByFileNPath(npath);

  for (const mathEl of el.querySelectorAll('.math:not(.is-loaded)')) {
    const display = mathEl.hasClass('math-block');
    const text = normalizeDisplayMathCode(
      mathEl.innerHTML.replace(/&(amp|lt|gt|quot);/g, (a) => TC[a as keyof typeof TC]),
    );

    mathEl.empty();
    const containerEl = createMathContainer();
    rendererManager.renderMath(text, containerEl, display, ndir, npath);
    mathEl.appendChild(containerEl);
    mathEl.setAttribute('contenteditable', 'false');
    mathEl.addClass('is-loaded');
  }
}
