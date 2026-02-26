import { syntaxTree } from '@codemirror/language';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { EditorHelper } from '@/editor/index';
import type { Processor, ProcessorKind } from '@/libs/processor';
import { extarctCMMath } from '@/libs/typst';
import { editorHelperFacet } from './Helper';

export interface ParsedRegion {
  index: number;
  skip: number;
  skipEnd: number;
  from: number; // ! skip 含まない
  to: number; // ! skipEnd 含む
  kind: ProcessorKind;
  processor: Processor;
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

const FOUND = Symbol('found');

const findRegionContaining = (view: EditorView, cursor: number): TypstRegion | null => {
  const tree = syntaxTree(view.state);
  const { from, to } = view.viewport;

  let mathStart: number | null = null;
  let isDisplayMath = false;
  let codeBlockStart: number | null = null;
  let codeBlockLang = '';
  let result: TypstRegion | null = null;
  let index = 0;

  try {
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
            if (mathStart === null) break;
            const innerFrom = mathStart;
            const innerTo = node.from;
            const kind: ProcessorKind = !isDisplayMath ? 'inline' : 'display';

            if (innerFrom <= innerTo) {
              if (innerFrom <= cursor && cursor <= innerTo) {
                result = { from: innerFrom, to: innerTo, kind, index };
                throw FOUND;
              }
              if (innerFrom > cursor) throw FOUND;
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
                throw FOUND;
              }
              if (regionFrom > cursor) throw FOUND;
              index++;
            }
            codeBlockStart = null;
            break;
          }
        }
        return true;
      },
    });
  } catch (e) {
    if (e !== FOUND) throw e;
  }

  return result;
};

const parseRegion = (view: EditorView, helper: EditorHelper, region: TypstRegion): ParsedRegion | null => {
  if (region.kind === 'codeblock') {
    const beginLine = view.state.doc.lineAt(region.from - 1);
    const lang = beginLine.text.slice(3).trim();
    region.lang = lang;

    // プロセッサーによるモード切り替え
    const processor = helper.plugin.settings.processor.codeblock?.processors.find((p) => p.id === lang);
    if (processor === undefined) return null;

    return {
      index: region.index,
      skip: processor.id.length + 1,
      skipEnd: 1,
      from: region.from,
      to: region.to,
      kind: 'codeblock',
      processor,
    };
  }

  // Math (inline / display)
  const isDisplay = region.kind === 'display';
  const content = view.state.sliceDoc(region.from, region.to);
  const { processor, eqStart, eqEnd } = extarctCMMath(helper.plugin.settings, content, isDisplay);

  if (region.from + eqStart > region.to) return null;

  return {
    index: region.index,
    skip: eqStart,
    skipEnd: eqEnd,
    from: region.from,
    to: region.to - eqEnd,
    kind: region.kind,
    processor,
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
          if (!helper) {
            this.activeRegion = null;
            return;
          }
          this.activeRegion = parseRegion(update.view, helper, {
            index: this.activeRegion.index,
            from: newFrom,
            to: newRawTo,
            kind: this.activeRegion.kind,
          });
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
    if (!helper) {
      this.activeRegion = null;
      return;
    }

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

export function getActiveRegion(view: EditorView): ParsedRegion | null {
  const pluginVal = view.plugin(typstMateCore);
  if (!pluginVal) return null;

  return pluginVal.activeRegion;
}

export function getRegionAt(view: EditorView, cursor: number): ParsedRegion | null {
  const helper = view.state.facet(editorHelperFacet);
  if (!helper) return null;

  const { from, to } = view.viewport;
  const regions = collectRegions(view, from, to);

  const region = regions.find(
    (r) =>
      r.from - (r.kind === 'inline' ? 1 : r.kind === 'display' ? 2 : r.kind === 'codeblock' ? 4 + r.lang!.length : 0) <=
        cursor && cursor <= r.to,
  );

  return region ? parseRegion(view, helper, region) : null;
}
