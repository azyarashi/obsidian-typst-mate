import { syntaxTree } from '@codemirror/language';
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { Notice } from 'obsidian';

import type { EditorHelper } from '@/editor/index';
import { type Processor, type ProcessorKind, RenderingEngine } from '@/libs/processor';
import { extarctCMMath } from '@/libs/typst';
import {
  highlight,
  LinkedNode,
  parse,
  parseCode,
  parseMath,
  reparse,
  Side,
  SyntaxKind,
  SyntaxMode,
  type SyntaxNode,
} from '@/utils/crates/typst-syntax';

import { editorHelperFacet } from './Helper';

export interface ParsedRegion {
  index: number;
  skip: number;
  skipEnd: number;
  from: number; // ! skip 含まない
  to: number; // ! skipEnd 含む
  kind: ProcessorKind;
  processor?: Processor;
  tree?: SyntaxNode;
  syntaxMode?: SyntaxMode | null;
  syntaxKind?: SyntaxKind | null;
  defaultMode: SyntaxMode;
}

const INLINE_MATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math';
const DISPLAY_MATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math_math-block';
const MATH_END = 'formatting_formatting-math_formatting-math-end_keyword_math_math-';

const CODEBLOCK_BEGIN = 'HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg';
const CODEBLOCK_END = 'HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg';

interface TypstRegion {
  index: number;
  from: number;
  to: number;
  kind: ProcessorKind;
  lang?: string;
}

export const collectRegions = (view: EditorView, from?: number, to?: number): TypstRegion[] => {
  const tree = syntaxTree(view.state);

  const rawRegions: TypstRegion[] = [];
  let index = 0;
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
          const kind = !isDisplayMath ? 'inline' : 'display';

          if (innerFrom <= innerTo) {
            rawRegions.push({ from: innerFrom, to: innerTo, kind, index });
            index++;
          }
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

          if (codeBlockStart < codeBlockEnd) {
            // ? 改行の分 + 1
            rawRegions.push({
              index,
              from: codeBlockStart + 1,
              to: codeBlockEnd,
              kind: 'codeblock',
              lang: codeBlockLang,
            });
            index++;
          }
          codeBlockStart = null;
          break;
        }
      }
      return true;
    },
  });
  return rawRegions;
};

function findRegionContaining(view: EditorView, cursor: number): TypstRegion | null {
  const tree = syntaxTree(view.state);
  const { from, to } = view.viewport;

  let mathStart: number | null = null;
  let isDisplayMath = false;
  let codeBlockStart: number | null = null;
  let codeBlockLang = '';
  let result: TypstRegion | null = null;
  let index = 0;

  tree.iterate({
    from,
    to,
    enter: (node) => {
      if (result !== null) return false;

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
          if (mathStart === null) break;
          const innerFrom = mathStart;
          const innerTo = node.from;
          const kind: ProcessorKind = !isDisplayMath ? 'inline' : 'display';

          if (innerFrom <= innerTo) {
            if (innerFrom <= cursor && cursor <= innerTo) {
              result = { from: innerFrom, to: innerTo, kind, index };
              return false;
            }
            if (innerFrom > cursor) return false;
            index++;
          }
          mathStart = null;
          break;
        }
        case CODEBLOCK_BEGIN: {
          codeBlockStart = node.to;
          codeBlockLang = view.state.sliceDoc(node.from + 3, codeBlockStart).trim();
          break;
        }
        case CODEBLOCK_END: {
          if (codeBlockStart === null) break;
          const codeBlockEnd = node.from - 1;

          if (codeBlockStart < codeBlockEnd) {
            const regionFrom = codeBlockStart + 1;
            if (regionFrom <= cursor && cursor <= codeBlockEnd) {
              result = { index, from: regionFrom, to: codeBlockEnd, kind: 'codeblock', lang: codeBlockLang };
              return false;
            }
            if (regionFrom > cursor) return false;
            index++;
          }
          codeBlockStart = null;
          break;
        }
      }
      return true;
    },
  });

  return result;
}

const parseRegion = (view: EditorView, helper: EditorHelper, region: TypstRegion): ParsedRegion | null => {
  if (region.kind === 'codeblock') {
    const beginLine = view.state.doc.lineAt(region.from - 1);
    const lang = beginLine.text.slice(3).trim();
    region.lang = lang;

    const processor = helper.plugin.settings.processor.codeblock?.processors.find((p) => p.id === lang);
    if (processor === undefined) return null;

    let tree: SyntaxNode | undefined;
    if (processor.renderingEngine === RenderingEngine.MathJax || processor.syntaxMode === null) tree = undefined;
    else {
      const mode = processor.syntaxMode ?? SyntaxMode.Markup;
      const text = view.state.sliceDoc(region.from, region.to);
      tree = mode === SyntaxMode.Code ? parseCode(text) : mode === SyntaxMode.Math ? parseMath(text) : parse(text);
    }

    return {
      index: region.index,
      skip: 0,
      skipEnd: 0,
      from: region.from,
      to: region.to,
      kind: 'codeblock',
      processor,
      tree,
      syntaxMode: undefined,
      syntaxKind: undefined,
      defaultMode: processor.syntaxMode ?? SyntaxMode.Markup,
    };
  }

  // Math (inline / display)
  const isDisplay = region.kind === 'display';
  const content = view.state.sliceDoc(region.from, region.to);
  const { processor, eqStart, eqEnd } = extarctCMMath(helper.plugin.settings, content, isDisplay);

  if (region.from + eqStart > region.to) return null;

  const skipEnd = isDisplay ? eqEnd : eqEnd;
  const innerText = view.state.sliceDoc(region.from + eqStart, region.to - skipEnd);

  let tree: SyntaxNode | undefined;
  if (processor.renderingEngine === RenderingEngine.MathJax || processor.syntaxMode === null) tree = undefined;
  else {
    const mode = processor.syntaxMode ?? SyntaxMode.Math;
    tree =
      mode === SyntaxMode.Code
        ? parseCode(innerText)
        : mode === SyntaxMode.Math
          ? parseMath(innerText)
          : parse(innerText);
  }

  return {
    index: region.index,
    skip: eqStart,
    skipEnd: skipEnd,
    from: region.from,
    to: region.to - skipEnd,
    kind: region.kind,
    processor,
    tree,
    syntaxMode: undefined,
    syntaxKind: undefined,
    defaultMode: processor.syntaxMode ?? SyntaxMode.Math,
  };
};

export class TypstMateCorePluginValue implements PluginValue {
  activeRegion: ParsedRegion | null = null;

  constructor(view: EditorView) {
    this.recompute(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      if (this.activeRegion) {
        const cursor = update.state.selection.main.head;
        const newFrom = update.changes.mapPos(this.activeRegion.from, -1);
        const rawTo =
          this.activeRegion.kind === 'codeblock'
            ? this.activeRegion.to
            : this.activeRegion.to + this.activeRegion.skipEnd;
        const newRawTo = update.changes.mapPos(Math.min(rawTo, update.changes.length), -1);
        if (newFrom <= cursor && cursor <= newRawTo) {
          const helper = update.view.state.facet(editorHelperFacet);

          const newRegion = parseRegion(update.view, helper, {
            index: this.activeRegion.index,
            from: newFrom,
            to: newRawTo,
            kind: this.activeRegion.kind,
          });

          if (newRegion && this.activeRegion.tree) {
            let changesCount = 0;
            let lastChange: any = null;
            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
              changesCount++;
              lastChange = { fromA, toA, fromB, toB, inserted: inserted.toString() };
            });

            if (changesCount === 1) {
              const innerFromA = this.activeRegion.from + this.activeRegion.skip;
              const innerToA = this.activeRegion.to;
              if (lastChange.fromA >= innerFromA && lastChange.toA <= innerToA) {
                const localStart = lastChange.fromA - innerFromA;
                const localEnd = lastChange.toA - innerFromA;
                const innerNewText = update.view.state.sliceDoc(newRegion.from + newRegion.skip, newRegion.to);
                try {
                  newRegion.tree = reparse(
                    this.activeRegion.tree,
                    innerNewText,
                    { start: localStart, end: localEnd },
                    lastChange.inserted.length,
                  );
                } catch (e) {
                  new Notice(String(e));
                }
              }
            }
          }

          this.activeRegion = newRegion;
          return;
        }
        this.recompute(update.view);
      } else {
        let hasDelimiter = false;
        update.changes.iterChanges((_fA, _tA, _fB, _tB, inserted) => {
          if (hasDelimiter) return;
          const text = inserted.toString();
          if (text.includes('$') || text.includes('`') || text.includes('~') || text.includes('\\')) {
            hasDelimiter = true;
          }
        });
        if (hasDelimiter) this.recompute(update.view);
      }
    }

    if (update.selectionSet) {
      const cursor = update.state.selection.main.head;
      if (this.activeRegion && this.activeRegion.from <= cursor && cursor <= this.activeRegion.to) return;
      this.recompute(update.view);
    }
  }

  recompute(view: EditorView) {
    const helper = view.state.facet(editorHelperFacet);

    const cursor = view.state.selection.main.head;
    const region = findRegionContaining(view, cursor);
    if (!region) {
      helper.hideAllPopup();
      this.activeRegion = null;
      return;
    }
    this.activeRegion = parseRegion(view, helper, region);
  }
}

export const typstMateCore = ViewPlugin.fromClass(TypstMateCorePluginValue);

export class TypstTextCorePluginValue implements PluginValue {
  activeRegion: ParsedRegion = {
    index: 0,
    skip: 0,
    skipEnd: 0,
    from: 0,
    to: 0,
    kind: 'codeblock',
    syntaxMode: undefined,
    syntaxKind: undefined,
    defaultMode: SyntaxMode.Markup,
  };

  constructor(view: EditorView) {
    this.activeRegion.to = view.state.doc.length;
    this.activeRegion.tree = parse(view.state.doc.toString());
  }

  update(update: ViewUpdate) {
    if (!update.docChanged) return;

    this.activeRegion.to = update.state.doc.length;

    let changesCount = 0;
    let changeFromA = 0;
    let changeToA = 0;
    let changeInsertedLen = 0;

    update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      changesCount++;
      changeFromA = fromA;
      changeToA = toA;
      changeInsertedLen = inserted.length;
    });

    if (changesCount === 1 && this.activeRegion.tree) {
      try {
        this.activeRegion.tree = reparse(
          this.activeRegion.tree,
          update.state.doc.toString(),
          { start: changeFromA, end: changeToA },
          changeInsertedLen,
        );
      } catch (e) {
        console.warn('TypstMate: Reparse failed, falling back to full parse.', e);
        this.activeRegion.tree = parse(update.state.doc.toString());
      }
    } else this.activeRegion.tree = parse(update.state.doc.toString());

    const cursor = update.state.selection.main.head;
    const { syntaxMode, syntaxKind } = getModeAndKind(this.activeRegion, cursor);
    this.activeRegion.syntaxMode = syntaxMode;
    this.activeRegion.syntaxKind = syntaxKind;
  }
}

export const typstTextCore = ViewPlugin.fromClass(TypstTextCorePluginValue);

export function getActiveRegion(view: EditorView): ParsedRegion | null {
  const markdownPlugin = view.plugin(typstMateCore);
  if (markdownPlugin) return markdownPlugin.activeRegion;

  const typstTextPlugin = view.plugin(typstTextCore);
  if (typstTextPlugin) return typstTextPlugin.activeRegion;

  return null;
}

export function getRegionAt(view: EditorView, cursor: number): ParsedRegion | null {
  const typstTextPlugin = view.plugin(typstTextCore);
  if (typstTextPlugin) return typstTextPlugin.activeRegion;

  const helper = view.state.facet(editorHelperFacet);

  const { from, to } = view.viewport;
  const regions = collectRegions(view, from, to);

  const region = regions.find(
    (r) =>
      r.from - (r.kind === 'inline' ? 1 : r.kind === 'display' ? 2 : r.kind === 'codeblock' ? 4 + r.lang!.length : 0) <=
        cursor && cursor <= r.to,
  );

  return region ? parseRegion(view, helper, region) : null;
}

export function typstSyntaxHighlighting() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private lastRegionIndex: number | null = null;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        const region = getActiveRegion(update.view);
        const regionChanged = region?.index !== this.lastRegionIndex;

        if (update.docChanged || update.viewportChanged || regionChanged) {
          this.decorations = this.buildDecorations(update.view, region);
          this.lastRegionIndex = region?.index ?? null;
        }
      }

      buildDecorations(view: EditorView, region?: ParsedRegion | null): DecorationSet {
        const targetRegion = region ?? getActiveRegion(view);
        if (!targetRegion || !targetRegion.tree) return Decoration.none;

        const tree = targetRegion.tree;
        const offset = targetRegion.kind === 'codeblock' ? targetRegion.from : targetRegion.from + targetRegion.skip;

        const marks: { from: number; to: number; class: string }[] = [];
        const traverse = (node: LinkedNode) => {
          const cssClass = highlight(node);
          if (cssClass) {
            const start = offset + node.offset;
            const end = offset + node.offset + node.len();
            if (start < end) marks.push({ from: start, to: end, class: cssClass });
          }
          for (const child of node.children()) traverse(child);
        };

        traverse(LinkedNode.new(tree));

        return Decoration.set(
          marks.map((m) => Decoration.mark({ class: m.class }).range(m.from, m.to)),
          true,
        );
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

export function getModeAndKind(
  region: ParsedRegion | null,
  pos: number,
): { syntaxMode: SyntaxMode | null; syntaxKind: SyntaxKind | null } {
  if (!region || !region.tree) return { syntaxMode: null, syntaxKind: null };

  let syntaxMode: SyntaxMode | null = region.defaultMode;

  const offset = region.kind === 'codeblock' ? region.from : region.from + region.skip;
  const relativePos = pos - offset;

  const linkedNode = LinkedNode.new(region.tree);
  const leftNode = linkedNode.leafAt(relativePos, Side.Before);
  const rightNode = linkedNode.leafAt(relativePos, Side.After);
  const syntaxKindLeft = leftNode?.kind() ?? SyntaxKind.None;
  const syntaxKindRight = rightNode?.kind() ?? SyntaxKind.End;

  const leftMode = getMode(leftNode) ?? region.defaultMode;
  const rightMode = getMode(rightNode) ?? region.defaultMode;

  // 両側が同じ
  if (leftMode === rightMode) syntaxMode = leftMode;
  // 左側が 行コメント または エスケープ
  else if (syntaxKindLeft === SyntaxKind.LineComment || syntaxKindLeft === SyntaxKind.Escape)
    syntaxMode = SyntaxMode.Opaque;
  // 右側が コードモード
  else if (rightMode === SyntaxMode.Code) syntaxMode = SyntaxMode.Code;
  // 左側が閉じられている
  else if (SyntaxKind.isTerminator(syntaxKindLeft) || syntaxKindLeft === SyntaxKind.Dollar) syntaxMode = rightMode;
  else syntaxMode = leftMode;

  return { syntaxMode, syntaxKind: syntaxKindRight };
}

function getMode(node?: LinkedNode): SyntaxMode | null {
  while (node) {
    const k = node.kind();

    if (isOpaqueKind(k)) return SyntaxMode.Opaque;
    if (k === SyntaxKind.Equation || k === SyntaxKind.Math) return SyntaxMode.Math;
    if (k === SyntaxKind.ContentBlock || k === SyntaxKind.Markup) return SyntaxMode.Markup;
    if (
      (SyntaxKind.Code <= k && k <= SyntaxKind.Numeric) ||
      (SyntaxKind.Parenthesized <= k && k <= SyntaxKind.Binary) ||
      SyntaxKind.LetBinding <= k
    )
      return SyntaxMode.Code;

    node = node.parent;
  }

  return null; // デフォルト
}

function isOpaqueKind(k: SyntaxKind) {
  return (
    k === SyntaxKind.Shebang || // #! ...
    k === SyntaxKind.LineComment || // // ...
    k === SyntaxKind.BlockComment || // /* ... */
    k === SyntaxKind.Raw || // raw
    k === SyntaxKind.Link || // [url](url)
    k === SyntaxKind.Ref || // @target
    k === SyntaxKind.Label || // <label></label>
    k === SyntaxKind.Str // "..."
  );
}
