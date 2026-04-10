import { syntaxTree } from '@codemirror/language';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import {
  parse,
  parseCode,
  parseMath,
  reparse,
  SyntaxMode,
  type SyntaxNode as TypstSyntaxNode,
} from '@typstmate/typst-syntax';

import type { ParsedRegion } from '@/editor/shared/utils/core';
import { editorHelper, extarctCMMath, settingsManager } from '@/libs';
import { type ProcessorKind, RenderingEngine } from '@/libs/processor';
import { getModeAndKindFromRegion } from '@/utils/typstSyntax';

interface Region {
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
const CODEBLOCK_DELIMITER = 'formatting_formatting-code-block_hmd-codeblock';

export const collectRegions = (view: EditorView, from?: number, to?: number): Region[] => {
  const tree = syntaxTree(view.state);

  const rawRegions: Region[] = [];
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
            rawRegions.push({ from: innerFrom, to: innerTo, kind });
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
              from: codeblockStart,
              to: codeblockEnd,
              kind: 'codeblock',
              lang: codeblockLang,
            });
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

function findActiveRegion(view: EditorView, pos: number): Region | null {
  const tree = syntaxTree(view.state);
  const { to: viewportTo } = view.viewport;

  const nodeAtCursor = tree.resolveInner(pos, 0);
  const nodeName = nodeAtCursor.name;
  const isDocumentNode = nodeName === 'Document';
  if (!isDocumentNode) {
    if (!nodeName.includes('math') && !nodeName.includes('codeblock')) return null;
    if (
      nodeName === INLINEMATH_BEGIN ||
      nodeName === DISPLAYMATH_BEGIN ||
      nodeName === MATH_END ||
      nodeName === CODEBLOCK_DELIMITER
    )
      return null;
  }

  const forward = nodeAtCursor.cursor();

  /**
   * 区切り文字 $, `, ~ を含まない.
   * コードブロックの場合, 改行も含まない.
   */
  let end: number;
  let isEndFound = false;
  forward.childAfter(pos);
  do {
    switch (forward.node.name) {
      case MATH_END: {
        isEndFound = true;
        end = forward.node.from;
        break;
      }
      case CODEBLOCK_END: {
        isEndFound = true;
        end = forward.node.from - 1; // '\n'
        break;
      }
      case INLINEMATH_BEGIN:
      case DISPLAYMATH_BEGIN:
      case CODEBLOCK_BEGIN:
        return null;
    }

    if (!forward.nextSibling()) forward.parent();
  } while (!isEndFound && forward.node.from <= viewportTo && forward.node.from !== 0);
  if (!isEndFound) return null;

  const backward = nodeAtCursor.cursor();
  backward.childBefore(pos);
  do {
    switch (backward.name) {
      case INLINEMATH_BEGIN:
        return {
          from: backward.node.to,
          to: end!,
          kind: 'inline',
        };
      case DISPLAYMATH_BEGIN:
        return {
          from: backward.node.to,
          to: end!,
          kind: 'display',
        };
      case CODEBLOCK_BEGIN: {
        const langEnd = backward.node.to;
        const lang = view.state.sliceDoc(backward.node.from + 3, langEnd).trim();
        return langEnd < pos && pos <= end!
          ? {
              from: langEnd - lang.length,
              to: end!,
              kind: 'codeblock',
              lang,
            }
          : null;
      }
      case MATH_END:
      case CODEBLOCK_END:
        return null;
    }

    if (!backward.prevSibling()) backward.parent();
  } while (backward.node);

  return null;
}

export function parseRegion(view: EditorView, region: Region, skipParse = false): ParsedRegion | null {
  // ! region.from, region.to は必ずそのまま
  // Codeblcok
  if (region.kind === 'codeblock') {
    const beginLine = view.state.doc.lineAt(region.from - 1);
    const lang = beginLine.text.slice(3).trim();
    const skip = lang.length + 1;

    const processor = settingsManager.settings.processor.codeblock?.processors.find((p) => p.id === lang);
    if (processor === undefined) return null;

    const mode = processor.syntaxMode ?? SyntaxMode.Markup;
    let tree: TypstSyntaxNode | undefined;
    if (processor.renderingEngine === RenderingEngine.MathJax || processor.syntaxMode === null) tree = undefined;
    else if (!skipParse) {
      const text = view.state.sliceDoc(region.from + skip, region.to);
      tree = mode === SyntaxMode.Code ? parseCode(text) : mode === SyntaxMode.Math ? parseMath(text) : parse(text);
    }

    return {
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
  const { processor, eqStart, eqEnd } = extarctCMMath(settingsManager.settings, content, isDisplay);

  if (region.to < region.from + eqStart) return null;

  const text = view.state.sliceDoc(region.from + eqStart, region.to - eqEnd);

  const mode = processor.syntaxMode ?? SyntaxMode.Math;
  let tree: TypstSyntaxNode | undefined;
  if (processor.renderingEngine === RenderingEngine.MathJax || processor.syntaxMode === null) tree = undefined;
  else if (!skipParse) {
    tree = mode === SyntaxMode.Code ? parseCode(text) : mode === SyntaxMode.Math ? parseMath(text) : parse(text);
  }

  return {
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

  constructor(view: EditorView) {
    requestAnimationFrame(() => requestAnimationFrame(() => this.recompute(view)));
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      if (this.activeRegion) {
        const cursor = update.state.selection.main.head;
        const newFrom = update.changes.mapPos(this.activeRegion.from, -1);
        const rawTo = this.activeRegion.to + this.activeRegion.skipEnd;
        const newRawTo = update.changes.mapPos(Math.min(rawTo, update.changes.length), -1);

        if (newFrom <= cursor && cursor <= newRawTo) {
          const newRegion = parseRegion(
            update.view,
            {
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

          this.updateActiveKindAndMode(cursor);
          return;
        }
        this.recompute(update.view);
      } else {
        let hasDelimiter = false;
        update.changes.iterChanges((_fA, _tA, fB, tB, inserted) => {
          if (hasDelimiter) return;
          const text = inserted.toString();
          const textNext = update.view.state.sliceDoc(tB, tB + 1);
          const currentLine = update.view.state.doc.lineAt(fB).text;
          if (
            text.includes('$') ||
            text.includes('`') ||
            text.includes('~') ||
            text.includes('\\') ||
            textNext.includes('$') ||
            textNext.includes('`') ||
            textNext.includes('~') ||
            textNext.includes('\\') ||
            (currentLine.startsWith('```') && text === '\n')
          )
            hasDelimiter = true;
        });
        if (hasDelimiter) this.recompute(update.view);
      }
    } else if (update.selectionSet) {
      const prevCursor = update.startState.selection.main.head;
      const cursor = update.state.selection.main.head;
      if (cursor === prevCursor) return;

      if (
        this.activeRegion &&
        this.activeRegion.from + this.activeRegion.skip <= cursor &&
        cursor <= this.activeRegion.to
      ) {
        const { kind, mode } = getModeAndKindFromRegion(this.activeRegion, cursor);
        this.activeRegion.activeKind = kind;
        this.activeRegion.activeMode = mode;
        return;
      }
      this.recompute(update.view);
    }
  }

  recompute(view: EditorView) {
    const cursor = view.state.selection.main.head;
    const region = findActiveRegion(view, cursor);
    if (!region) {
      editorHelper.hideAllPopup();
      this.activeRegion = null;
      return;
    }
    this.activeRegion = parseRegion(view, region);

    this.updateActiveKindAndMode(cursor);
  }

  updateActiveKindAndMode(cursor: number): boolean {
    if (!this.activeRegion) return false;
    const { mode, kind } = getModeAndKindFromRegion(this.activeRegion, cursor);
    this.activeRegion.activeMode = mode;
    this.activeRegion.activeKind = kind;
    return true;
  }
}

export const markdownCore = ViewPlugin.fromClass(MarkdownCorePluginValue);
