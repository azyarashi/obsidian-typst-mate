import { syntaxTree } from '@codemirror/language';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
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
  kind: ProcessorKind | null;
  processor: Processor | null;
  tokens: SyntaxToken[];
  root: SyntaxNode;
}

export function getActiveRegion(view: EditorView): ParsedRegion | undefined {
  const pluginVal = view.plugin(typstMateCore);
  if (!pluginVal) return undefined;

  const cursor = view.state.selection.main.head;
  return pluginVal.parsedRegions.find((r) => r.from <= cursor && cursor <= r.to);
}

const INLINE_MATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math';
const DISPLAY_MATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math_math-block';
const MATH_END = 'formatting_formatting-math_formatting-math-end_keyword_math_math-';

const CODEBLOCK_BEGIN = 'HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg';
const CODEBLOCK_END = 'HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg';

interface MathRegion {
  skip: number;
  from: number;
  to: number;
  mode: SyntaxMode;
  kind: ProcessorKind;
  processor: Processor;
}

export const collectRegions = (
  view: EditorView,
  from: number,
  to: number,
  helper: EditorHelper,
  cursor: number | null,
) => {
  const tree = syntaxTree(view.state);

  const rawRegions: MathRegion[] = [];
  let mathStart: number | null = null; // 区切り文字は含まない
  let isDisplayMath = false;
  let codeBlockStart: number | null = null; // 区切り文字は含まない
  let codeBlockLang: string = '';
  tree.iterate({
    from,
    to,
    enter: (node) => {
      switch (node.name) {
        case INLINE_MATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = false;
          break;
        case DISPLAY_MATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = true;
          break;
        case MATH_END: {
          // ? ビューポートの関係で開始ノードが見つからなかった場合
          if (mathStart === null) break;

          const innerFrom = mathStart;
          const innerTo = node.from;
          if (cursor !== null && (cursor < innerFrom || innerTo < cursor)) {
            mathStart = null;
            break;
          }

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
          if (cursor !== null && (cursor < codeBlockStart || codeBlockEnd < cursor)) {
            codeBlockStart = null;
            break;
          }

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
      }
      return true;
    },
  });

  return rawRegions;
};

export class TypstMateCorePluginValue implements PluginValue {
  parsedRegions: ParsedRegion[] = [];

  constructor(view: EditorView) {
    this.compute(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) this.compute(update.view);
  }

  compute(view: EditorView) {
    const { from, to } = view.viewport;
    const helper = view.state.facet(editorHelperFacet);
    if (!helper) return;
    const regions = collectRegions(view, from, to, helper, view.state.selection.main.head);
    if (regions.length === 0) helper.hideAllPopup();

    this.parsedRegions = regions.map((region) => {
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
        if ('children' in node) {
          for (const child of node.children) {
            offsetNode(child, offset);
          }
        }
      };
      offsetNode(root, region.from);

      const tokens: SyntaxToken[] = [];
      const collectTokens = (node: SyntaxNode | SyntaxToken) => {
        if (!('children' in node) || !node.children || node.children.length === 0) {
          // Leaf node is effectively a token
          tokens.push({
            kind: node.kind,
            from: node.from,
            to: node.to,
            text: view.state.sliceDoc(node.from, node.to),
            mode: node.mode ?? region.mode,
          } as SyntaxToken);
        } else {
          for (const child of node.children) {
            collectTokens(child);
          }
        }
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
    });
  }
}

export const typstMateCore = ViewPlugin.fromClass(TypstMateCorePluginValue);
