import { syntaxTree } from '@codemirror/language';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { debounce } from 'obsidian';
import type { EditorHelper } from '@/editor/index';
import { type Processor, type ProcessorKind, RenderingEngine } from '@/libs/processor';
import { extarctCMMath } from '@/libs/typst';
import {
  SyntaxKind,
  SyntaxMode,
  type SyntaxNode,
  type SyntaxToken,
  TypstParser,
} from '@/utils/rust/crates/typst-synatx';
import { editorHelperFacet } from './Helper';

export interface ParsedRegion {
  skip: number;
  from: number;
  to: number;
  mode: SyntaxMode;
  kind: ProcessorKind | 'extended';
  processor: Processor;
  tokens: SyntaxToken[];
  root: SyntaxNode;
}

const INLINE_MATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math';
const DISPLAY_MATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math_math-block';
const MATH_END = 'formatting_formatting-math_formatting-math-end_keyword_math_math-';

const CODEBLOCK_BEGIN = 'HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg';
const CODEBLOCK_END = 'HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg';

interface TypstRegion {
  skip: number;
  from: number;
  to: number;
  mode: SyntaxMode;
  kind: ProcessorKind | 'extended';
  processor: Processor;
}

export const collectRegions = (view: EditorView, helper: EditorHelper, from?: number, to?: number): TypstRegion[] => {
  const tree = syntaxTree(view.state);

  const rawRegions: TypstRegion[] = [];
  let mathStart: number | null = null; // 区切り文字は含まない
  let isDisplayMath = false;
  let codeBlockStart: number | null = null; // 区切り文字は含まない
  let codeBlockLang: string = '';
  let dollarPositions: number[] = [];
  tree.iterate({
    from,
    to,
    enter: (node) => {
      switch (node.name) {
        case INLINE_MATH_BEGIN:
          if (dollarPositions.includes(node.from)) dollarPositions.remove(node.from);
          mathStart = node.to;
          isDisplayMath = false;
          break;
        case DISPLAY_MATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = true;
          break;
        case MATH_END: {
          if (dollarPositions.includes(node.from)) dollarPositions.remove(node.from);
          // ? ビューポートの関係で開始ノードが見つからなかった場合
          if (mathStart === null) break;

          const innerFrom = mathStart;
          const innerTo = node.from;

          // プロセッサーによるモード切り替え
          const content = view.state.sliceDoc(innerFrom, innerTo);
          const { processor, eqStart, eqEnd } = extarctCMMath(helper.plugin.settings, content, isDisplayMath);
          const mode = processor.mode ?? SyntaxMode.Math;
          const kind = !isDisplayMath ? 'inline' : 'display';

          if (innerFrom + eqStart <= innerTo)
            rawRegions.push({ skip: eqStart, from: innerFrom + eqStart, to: innerTo - eqEnd, mode, kind, processor });
          mathStart = null;
          break;
        }
        case CODEBLOCK_BEGIN: {
          codeBlockStart = node.to;
          codeBlockLang = view.state.sliceDoc(node.from + 3, codeBlockStart).trim();
          break;
        }
        case CODEBLOCK_END: {
          // ? ビューポートの関係で開始ノードが見つからなかった場合
          if (codeBlockStart === null) break;
          const codeBlockEnd = node.from - 1;

          // プロセッサーによるモード切り替え
          const processor = helper.plugin.settings.processor.codeblock?.processors.find((p) => p.id === codeBlockLang);
          if (processor === undefined || processor.renderingEngine === RenderingEngine.MathJax) {
            codeBlockStart = null;
            break;
          }
          const mode = processor.mode ?? SyntaxMode.Markup;

          if (codeBlockStart < codeBlockEnd)
            // ? 改行の分 + 1
            rawRegions.push({
              skip: 0,
              from: codeBlockStart + 1,
              to: codeBlockEnd,
              mode,
              kind: 'codeblock',
              processor,
            });
          codeBlockStart = null;
          break;
        }
        case 'Document': {
          const text = view.state.sliceDoc(node.from, node.to).replaceAll('\\$', '  ').replaceAll('$$', '  ');
          for (let i = 0; i < text.length; i++) if (text[i] === '$') dollarPositions.push(node.from + i);
          break;
        }
      }
      return true;
    },
  });
  if (from !== undefined && to !== undefined) dollarPositions = dollarPositions.filter((p) => from <= p && p <= to);
  for (const region of rawRegions) {
    dollarPositions = dollarPositions.filter((p) => !(region.from <= p && p <= region.to));
  }
  for (const p of dollarPositions) {
    if (mathStart === null) mathStart = p;
    else {
      rawRegions.push({
        skip: 0,
        from: mathStart + 1,
        to: p,
        mode: SyntaxMode.Math,
        kind: 'extended',
        processor: helper.plugin.settings.processor.display.processors.at(-1)!,
      });
      mathStart = null;
    }
  }

  return rawRegions;
};

const parseRegion = (view: EditorView, region: TypstRegion): ParsedRegion => {
  const text = view.state.sliceDoc(region.from, region.to);
  const rootKind =
    region.mode === SyntaxMode.Math
      ? SyntaxKind.Math
      : region.mode === SyntaxMode.Code
        ? SyntaxKind.Code
        : SyntaxKind.Markup;

  const parser = new TypstParser(text, rootKind);
  const root = parser.parse();

  const offsetNode = (node: SyntaxNode | SyntaxToken, offset: number) => {
    node.from += offset;
    node.to += offset;
    if ('children' in node) for (const child of node.children) offsetNode(child, offset);
  };
  offsetNode(root, region.from);

  const tokens: SyntaxToken[] = [];
  const collectTokens = (node: SyntaxNode | SyntaxToken) => {
    if (!('children' in node) || !node.children || node.children.length === 0) {
      tokens.push({
        kind: node.kind,
        from: node.from,
        to: node.to,
        text: view.state.sliceDoc(node.from, node.to),
        mode: node.mode ?? region.mode,
      } as SyntaxToken);
    } else for (const child of node.children) collectTokens(child);
  };
  collectTokens(root);

  return {
    skip: region.skip,
    from: region.from,
    to: region.to,
    mode: region.mode,
    kind: region.kind,
    processor: region.processor,
    tokens,
    root,
  };
};

export const parseCode = (text: string, kind: SyntaxKind) => {
  const parser = new TypstParser(text, kind);
  const root = parser.parse();

  const tokens: SyntaxToken[] = [];
  const collectTokens = (node: SyntaxNode | SyntaxToken) => {
    if (!('children' in node) || !node.children || node.children.length === 0) {
      tokens.push({
        kind: node.kind,
        from: node.from,
        to: node.to,
        text: text.slice(node.from, node.to),
        mode: node.mode ?? kind,
      } as SyntaxToken);
    } else for (const child of node.children) collectTokens(child);
  };
  collectTokens(root);

  return {
    skip: 0,
    from: 0,
    to: text.length,
    tokens,
    root,
  };
};

export class TypstMateCorePluginValue implements PluginValue {
  typstRegions: TypstRegion[] = [];
  activeRegion: ParsedRegion | null = null;
  computeDebounce: (view: EditorView) => void;

  constructor(view: EditorView) {
    this.computeFull(view);

    this.computeDebounce = debounce((view: EditorView) => this.computeSelection(view), 100, true);
  }

  update(update: ViewUpdate) {
    // 編集中ならfrom, toを限定
    if (update.docChanged || this.activeRegion === null) this.computeFull(update.view);
    else if (update.viewportChanged) this.computeDebounce(update.view);
    else if (update.selectionSet) this.computeSelection(update.view);
  }

  computeFull(view: EditorView) {
    const helper = view.state.facet(editorHelperFacet);
    if (!helper) return this.unsetActiveRegion();

    const cursor = view.state.selection.main.head;
    const { from, to } = view.viewport;

    const regions = collectRegions(view, helper, from, to);
    const region = regions.find((r) => r.from <= cursor && cursor <= r.to);
    if (!region) return this.unsetActiveRegion(helper);

    this.typstRegions = regions;
    this.activeRegion = parseRegion(view, region);
  }

  computeSelection(view: EditorView) {
    const helper = view.state.facet(editorHelperFacet);
    if (!helper) return this.unsetActiveRegion();

    const cursor = view.state.selection.main.head;
    const region = this.typstRegions.find((r) => r.from <= cursor && cursor <= r.to);
    if (!region) return this.unsetActiveRegion(helper);

    this.activeRegion = parseRegion(view, region);
  }

  private unsetActiveRegion(helper?: EditorHelper) {
    helper?.hideAllPopup();
    this.activeRegion = null;
  }
}

export const typstMateCore = ViewPlugin.fromClass(TypstMateCorePluginValue);

export function getActiveRegion(view: EditorView): ParsedRegion | null {
  const pluginVal = view.plugin(typstMateCore);
  if (!pluginVal) return null;

  return pluginVal.activeRegion;
}

export function getRegionAt(view: EditorView, cursor: number): ParsedRegion | null {
  const pluginVal = view.plugin(typstMateCore);
  if (!pluginVal) return null;

  const region = pluginVal.typstRegions.find((r) => r.from <= cursor && cursor <= r.to);
  return region ? parseRegion(view, region) : null;
}
