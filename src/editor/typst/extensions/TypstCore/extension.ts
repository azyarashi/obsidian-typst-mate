import { parse, reparse, SyntaxMode } from '@typstmate/typst-syntax';
import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { TypstMate } from '@/api';
import type { ParsedRegion } from '@/editor/shared/utils/core';
import { getModeAndKindFromRegion } from '@/utils/typstSyntax';

export class TypstCorePluginValue implements PluginValue {
  activeRegion: ParsedRegion = {
    context: 'typst',
    skip: 0,
    skipEnd: 0,
    from: 0,
    to: 0,
    kind: null,
    mode: SyntaxMode.Markup,
  };

  constructor(view: EditorView) {
    this.activeRegion.to = view.state.doc.length;
    this.activeRegion.tree = parse(view.state.doc.toString());

    this.finalize(view.state.selection.main.head, view);
  }

  update(update: ViewUpdate) {
    const view = update.view;
    const cursor = update.state.selection.main.head;
    if (!update.docChanged) {
      if (update.selectionSet) {
        const prevSelection = update.startState.selection;
        const selection = update.state.selection;
        if (selection.main.head === prevSelection.main.head && selection.ranges.length === prevSelection.ranges.length)
          return;

        this.finalize(cursor, view);
      }
      return;
    }

    this.activeRegion.to = update.state.doc.length;

    let isSingleChange = false;
    let changeFromA = 0;
    let changeToA = 0;
    let changeInsertedLen = 0;

    update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      if (isSingleChange) {
        isSingleChange = false;
        return;
      }
      isSingleChange = true;
      changeFromA = fromA;
      changeToA = toA;
      changeInsertedLen = inserted.length;
    });

    if (isSingleChange && this.activeRegion.tree) {
      try {
        this.activeRegion.tree = reparse(
          this.activeRegion.tree,
          update.state.doc.toString(),
          { start: changeFromA, end: changeToA },
          changeInsertedLen,
        );
      } catch (e) {
        console.warn('[Typst Mate] TypstCore.reparse failed', e);
        this.activeRegion.tree = parse(update.state.doc.toString());
      }
    } else this.activeRegion.tree = parse(update.state.doc.toString());

    this.finalize(cursor, view);
  }

  finalize(cursor: number, view: EditorView) {
    const { mode, kindLeft, kindRight } = getModeAndKindFromRegion(this.activeRegion, cursor);
    this.activeRegion.activeMode = mode !== null && 1 < view.state.selection.ranges.length ? SyntaxMode.Plain : mode;
    this.activeRegion.activeKindLeft = kindLeft;
    this.activeRegion.activeKindRight = kindRight;

    TypstMate.ctx = { view, cursor, region: this.activeRegion };
  }
}

export const typstTextCore = ViewPlugin.fromClass(TypstCorePluginValue);
