import { syntaxTree } from '@codemirror/language';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { parse, parseCode, parseMath, reparse, SyntaxMode, type SyntaxNode } from '@typstmate/typst-syntax';

import type { EditorHelper } from '@/editor';
import { helperFacet } from '@/editor/shared/extensions/Helper';
import type { ParsedRegion } from '@/editor/shared/utils/core';
import { type ProcessorKind, RenderingEngine } from '@/libs/processor';
import { extarctCMMath } from '@/libs/typst';
import { getModeAndKind } from '@/utils/typstSyntax';

interface Region {
  id: number;

  /** right after the delimiter */
  from: number;
  /** right before the delimiter */
  to: number;

  kind: ProcessorKind;

  lang?: string;
}

const INLINEMATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math';
const DISPLAYMATH_BEGIN = 'formatting_formatting-math_formatting-math-begin_keyword_math_math-block';
const MATH_END = 'formatting_formatting-math_formatting-math-end_keyword_math_math-';

const CODEBLOCK_BEGIN = 'HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg';
const CODEBLOCK_END = 'HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-codeblock-end_HyperMD-codeblock-end-bg';

export const collectRegions = (view: EditorView, from?: number, to?: number): Region[] => {
  const tree = syntaxTree(view.state);

  const rawRegions: Region[] = [];
  let id = 0;
  let mathStart: number | null = null; // 区切り文字は含まない
  let isDisplayMath = false;
  let codeblockLangEnd: number | null = null; // 区切り文字は含まない
  let codeblockLang: string;

  tree.iterate({
    from,
    to,
    enter: (node) => {
      switch (node.name) {
        case INLINEMATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = false;
          break;
        case DISPLAYMATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = true;
          break;
        case MATH_END: {
          if (mathStart === null) break;

          const innerFrom = mathStart;
          const innerTo = node.from;
          const kind = !isDisplayMath ? 'inline' : 'display';

          if (innerFrom <= innerTo) {
            rawRegions.push({ from: innerFrom, to: innerTo, kind, id });
            id++;
          }

          mathStart = null;
          break;
        }
        case CODEBLOCK_BEGIN: {
          codeblockLangEnd = node.to;
          codeblockLang = view.state.sliceDoc(node.from + 3, codeblockLangEnd).trim();
          break;
        }
        case CODEBLOCK_END: {
          if (codeblockLangEnd === null) break;

          const codeblockStart = codeblockLangEnd - codeblockLang.length;
          const codeblockEnd = node.from - 1;

          if (codeblockLangEnd < codeblockEnd) {
            rawRegions.push({
              id,
              from: codeblockStart,
              to: codeblockEnd,
              kind: 'codeblock',
              lang: codeblockLang,
            });
            id++;
          }

          codeblockLangEnd = null;
          break;
        }
      }

      return true;
    },
  });
  return rawRegions;
};

function findActiveRegion(view: EditorView, cursor: number): Region | null {
  const tree = syntaxTree(view.state);
  const { from, to } = view.viewport;

  let id = 0;
  let mathStart: number | null = null;
  let isDisplayMath = false;
  let codeblockLangEnd: number | null = null;
  let codeblockLang: string;

  let result: Region | null = null;
  tree.iterate({
    from,
    to,
    enter: (node) => {
      if (result !== null) return false;

      switch (node.name) {
        case INLINEMATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = false;
          break;
        case DISPLAYMATH_BEGIN:
          mathStart = node.to;
          isDisplayMath = true;
          break;
        case MATH_END: {
          if (mathStart === null) break;

          const innerFrom = mathStart;
          const innerTo = node.from;
          const kind = !isDisplayMath ? 'inline' : 'display';

          if (innerFrom <= innerTo) {
            if (innerFrom <= cursor && cursor <= innerTo) {
              result = { from: innerFrom, to: innerTo, kind, id };
              return false;
            }
            if (cursor < innerFrom) return false;
            id++;
          }

          mathStart = null;
          break;
        }

        case CODEBLOCK_BEGIN: {
          codeblockLangEnd = node.to;
          codeblockLang = view.state.sliceDoc(node.from + 3, codeblockLangEnd).trim();
          break;
        }
        case CODEBLOCK_END: {
          if (codeblockLangEnd === null) break;

          const codeblockStart = codeblockLangEnd - codeblockLang.length;
          const codeblockEnd = node.from - 1;

          if (codeblockLangEnd < codeblockEnd) {
            // ? the range of ... in  ```lang\n...\n```
            if (codeblockLangEnd < cursor && cursor < codeblockEnd) {
              result = { id, from: codeblockStart, to: codeblockEnd, kind: 'codeblock', lang: codeblockLang };
              return false;
            }
            if (cursor < codeblockLangEnd) return false;
            id++;
          }

          codeblockLangEnd = null;
          break;
        }
      }

      return true;
    },
  });

  return result;
}

export function parseRegion(
  view: EditorView,
  helper: EditorHelper,
  region: Region,
  skipParse = false,
): ParsedRegion | null {
  // ! region.from, region.to は必ずそのまま
  // Codeblcok
  if (region.kind === 'codeblock') {
    const beginLine = view.state.doc.lineAt(region.from - 1);
    const lang = beginLine.text.slice(3).trim();
    const skip = lang.length + 1;

    const processor = helper.plugin.settings.processor.codeblock?.processors.find((p) => p.id === lang);
    if (processor === undefined) return null;

    const mode = processor.syntaxMode ?? SyntaxMode.Markup;
    let tree: SyntaxNode | undefined;
    if (processor.renderingEngine === RenderingEngine.MathJax || processor.syntaxMode === null) tree = undefined;
    else if (!skipParse) {
      const text = view.state.sliceDoc(region.from + skip, region.to);
      tree = mode === SyntaxMode.Code ? parseCode(text) : mode === SyntaxMode.Math ? parseMath(text) : parse(text);
    }

    return {
      id: region.id,

      skip,
      skipEnd: 1,
      from: region.from,
      to: region.to,

      kind: region.kind,
      processor,

      mode,
      tree,
    };
  }

  // Inline / Display
  const isDisplay = region.kind === 'display';
  const content = view.state.sliceDoc(region.from, region.to);
  const { processor, eqStart, eqEnd } = extarctCMMath(helper.plugin.settings, content, isDisplay);

  if (region.to < region.from + eqStart) return null;

  const text = view.state.sliceDoc(region.from + eqStart, region.to - eqEnd);

  const mode = processor.syntaxMode ?? SyntaxMode.Math;
  let tree: SyntaxNode | undefined;
  if (processor.renderingEngine === RenderingEngine.MathJax || processor.syntaxMode === null) tree = undefined;
  else if (!skipParse) {
    tree = mode === SyntaxMode.Code ? parseCode(text) : mode === SyntaxMode.Math ? parseMath(text) : parse(text);
  }

  return {
    id: region.id,

    skip: eqStart,
    skipEnd: eqEnd,
    from: region.from,
    to: region.to - eqEnd,

    kind: region.kind,
    processor,

    mode,
    tree,
  };
}

export class MarkdownCorePluginValue implements PluginValue {
  activeRegion: ParsedRegion | null = null;
  prevCursor: number = 0;

  constructor(view: EditorView) {
    this.recompute(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      if (this.activeRegion) {
        const cursor = update.state.selection.main.head;
        const newFrom = update.changes.mapPos(this.activeRegion.from, -1);
        const rawTo = this.activeRegion.to + this.activeRegion.skipEnd;
        const newRawTo = update.changes.mapPos(Math.min(rawTo, update.changes.length), -1);

        if (newFrom <= cursor && cursor <= newRawTo) {
          const helper = update.view.state.facet(helperFacet);

          const newRegion = parseRegion(
            update.view,
            helper,
            {
              id: this.activeRegion.id,
              from: newFrom,
              to: newRawTo - this.activeRegion.skipEnd,
              kind: this.activeRegion.kind,
            },
            true,
          );

          if (newRegion) {
            let reparsed = true;
            if (this.activeRegion.tree) {
              let changesCount = 0;
              let lastChange: any = null;
              update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                changesCount++;
                lastChange = { fromA, toA, fromB, toB, inserted: inserted.toString() };
              });

              if (changesCount === 1) {
                const innerFromA = this.activeRegion.from + this.activeRegion.skip;
                const innerToA = this.activeRegion.to;
                if (innerFromA <= lastChange.fromA && lastChange.toA <= innerToA) {
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
                    reparsed = true;
                  } catch (e) {
                    console.error('TypstMate: Incremental reparse failed', e);
                  }
                }
              }
            }

            if (
              !reparsed &&
              newRegion.processor?.renderingEngine !== RenderingEngine.MathJax &&
              newRegion.processor?.syntaxMode !== null
            ) {
              const mode = newRegion.mode;
              const innerText = update.view.state.sliceDoc(newRegion.from + newRegion.skip, newRegion.to);
              newRegion.tree =
                mode === SyntaxMode.Code
                  ? parseCode(innerText)
                  : mode === SyntaxMode.Math
                    ? parseMath(innerText)
                    : parse(innerText);
            }
          }

          this.activeRegion = newRegion;
          this.prevCursor = cursor;

          this.updateActiveKindAndMode(cursor);
          return;
        }
        this.recompute(update.view);
      } else {
        let hasDelimiter = false;
        update.changes.iterChanges((_fA, _tA, _fB, tB, inserted) => {
          if (hasDelimiter) return;
          const text = inserted.toString();
          const textNext = update.view.state.sliceDoc(tB, tB + 1);
          if (
            text.includes('$') ||
            text.includes('`') ||
            text.includes('~') ||
            text.includes('\\') ||
            textNext.includes('$') ||
            textNext.includes('`') ||
            textNext.includes('~') ||
            textNext.includes('\\')
          )
            hasDelimiter = true;
        });
        if (hasDelimiter) this.recompute(update.view);
      }
    } else if (update.selectionSet) {
      const cursor = update.state.selection.main.head;
      if (cursor === this.prevCursor) return;
      this.prevCursor = cursor;

      if (
        this.activeRegion &&
        this.activeRegion.from + this.activeRegion.skip <= cursor &&
        cursor <= this.activeRegion.to
      ) {
        const { kind, mode } = getModeAndKind(this.activeRegion, cursor);
        this.activeRegion.activeKind = kind;
        this.activeRegion.activeMode = mode;
        return;
      }
      this.recompute(update.view);
    }
  }

  recompute(view: EditorView) {
    const helper = view.state.facet(helperFacet);

    const cursor = view.state.selection.main.head;
    const region = findActiveRegion(view, cursor);
    if (!region) {
      helper.hideAllPopup();
      this.activeRegion = null;
      return;
    }
    this.activeRegion = parseRegion(view, helper, region);

    this.updateActiveKindAndMode(cursor);
  }

  updateActiveKindAndMode(cursor: number): boolean {
    if (!this.activeRegion) return false;
    const { mode, kind } = getModeAndKind(this.activeRegion, cursor);
    this.activeRegion.activeMode = mode;
    this.activeRegion.activeKind = kind;
    return true;
  }
}

export const markdownCore = ViewPlugin.fromClass(MarkdownCorePluginValue);
