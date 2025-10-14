import type { EditorHelper } from 'md@/index';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { debounce } from 'obsidian';
import type { MathObject } from '../others/math';

const decorationClasses = [
  'typ-id',
  'typ-bracket',
  'typ-brace',
  'typ-paren',
  'typ-enclosing',

  'typ-comment',
  'typ-punct',
  'typ-escape',
  'typ-strong',
  'typ-emph',
  'typ-link',
  'typ-raw',
  'typ-label',
  'typ-ref',
  'typ-heading',
  'typ-marker',
  'typ-term',
  'typ-math-delim',
  'typ-math-op',
  'typ-key',
  'typ-op',
  'typ-num',
  'typ-str',
  'typ-func',
  'typ-pol',
  'typ-error',
];

const decorations = Object.fromEntries(decorationClasses.map((k) => [k, Decoration.mark({ class: k })]));

export const addMark = StateEffect.define<{ id: number; from: number; to: number; className: string }>();
export const removeMark = StateEffect.define<{ id: number }>();

export const clearMarks = StateEffect.define<null>();
export const setHighlight = StateEffect.define<{ marks: Mark[]; deco: DecorationSet }>();

type Mark = { id: number; from: number; to: number; className: string };
type MarkState = { marks: Mark[]; deco: DecorationSet };

export const createSyntaxHighlightExtension = (helper: EditorHelper, getMathObject: () => MathObject | null) => {
  let latestMarks: Mark[] = [];
  const updateHighlight = debounce(
    (mathObject: MathObject | null) => {
      const view = helper.editor?.cm;
      if (!view) return;
      if (!mathObject) {
        latestMarks = [];
        view.dispatch({ effects: [clearMarks.of(null)] });
        return;
      }

      const highlight = (res: any) => {
        let marks = latestMarks.slice();
        if (res?.removes) for (const id of res.removes as number[]) marks = marks.filter((m) => m.id !== id);
        if (res?.adds) {
          for (const [id, from, to, className] of res.adds as [number, number, number, string][]) {
            if (mathObject.endOffset <= to) continue;
            if (className === 'typ-enclosing' && !helper.plugin.settings.enableEnclosingBracketPairHighlight) continue;
            marks.push({ id, from, to, className });
          }
        }
        if (helper.plugin.typstManager.beforeId) {
          const from = mathObject.startOffset;
          const to = from + helper.plugin.typstManager.beforeId.length;
          marks.push({ id: 2147483647, from, to, className: 'typ-id' });
        }
        const ranges = marks.map((m) => decorations[m.className]?.range(m.from, m.to)).filter(Boolean) as any[];
        const deco = Decoration.set(ranges, true);
        latestMarks = marks;
        view.dispatch({ effects: [setHighlight.of({ marks, deco })] });
      };

      const result = helper.plugin.typst.highlight(
        helper.plugin.typstManager.beforeCodeIndex,
        mathObject.startOffset,
        mathObject.endOffset,
        helper.editor?.cm.state.selection.main.head ?? 0,
      );

      if (result instanceof Promise) result.then(highlight.bind(this));
      else highlight(result);
    },
    500,
    true,
  );

  return StateField.define<MarkState>({
    create() {
      return { marks: [], deco: Decoration.none } as MarkState;
    },

    update(value, tr) {
      const mathObject = getMathObject();
      if (tr.docChanged) updateHighlight(mathObject);
      // else updateHighlight(null);

      let marks = value.marks;
      let deco = value.deco;

      for (const e of tr.effects) {
        if (e.is(setHighlight)) {
          const v = e.value as { marks: Mark[]; deco: DecorationSet };
          marks = v.marks;
          deco = v.deco;
          latestMarks = marks;
        } else if (e.is(clearMarks)) {
          marks = [];
          deco = Decoration.none;
          latestMarks = [];
        }
      }

      return { marks, deco } as MarkState;
    },

    provide: (f) => EditorView.decorations.from(f, (s) => s.deco),
  });
};
