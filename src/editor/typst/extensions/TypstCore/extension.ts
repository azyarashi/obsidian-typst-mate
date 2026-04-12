import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { parse, reparse, SyntaxMode } from '@typstmate/typst-syntax';
import type { ParsedRegion } from '@/editor/shared/utils/core';
import { getModeAndKindFromRegion } from '@/utils/typstSyntax';

export class TypstCorePluginValue implements PluginValue {
  activeRegion: ParsedRegion = {
    skip: 0,
    skipEnd: 0,
    from: 0,
    to: 0,
    kind: 'codeblock',
    mode: SyntaxMode.Markup,
  };

  constructor(view: EditorView) {
    this.activeRegion.to = view.state.doc.length;
    this.activeRegion.tree = parse(view.state.doc.toString());
  }

  update(update: ViewUpdate) {
    if (!update.docChanged) {
      if (update.selectionSet) {
        const cursor = update.state.selection.main.head;
        this.updateKindAndMode(cursor);
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
        console.warn('TypstMate: Reparse failed, falling back to full parse.', e);
        this.activeRegion.tree = parse(update.state.doc.toString());
      }
    } else this.activeRegion.tree = parse(update.state.doc.toString());

    const cursor = update.state.selection.main.head;
    this.updateKindAndMode(cursor);
  }

  updateKindAndMode(cursor: number) {
    const { kind, mode } = getModeAndKindFromRegion(this.activeRegion, cursor);
    this.activeRegion.activeKind = kind;
    this.activeRegion.activeMode = mode;
  }
}

export const typstTextCore = ViewPlugin.fromClass(TypstCorePluginValue);
