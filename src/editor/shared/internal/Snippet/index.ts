import { type Completion, pickedCompletion } from '@codemirror/autocomplete';
import { indentUnit } from '@codemirror/language';
import {
  type ChangeDesc,
  EditorSelection,
  type EditorState,
  MapMode,
  type StateCommand,
  StateEffect,
  StateField,
  Text,
  Transaction,
  type TransactionSpec,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

class TabStop {
  level: number;
  line: number;
  from: number;
  to: number;

  constructor(level: number, line: number, from: number, to: number) {
    this.level = level;
    this.line = line;
    this.from = from;
    this.to = to;
  }
}

class TabStopRange {
  level: number;
  from: number;
  to: number;

  constructor(level: number, from: number, to: number) {
    this.level = level;
    this.from = from;
    this.to = to;
  }

  map(changes: ChangeDesc) {
    const from = changes.mapPos(this.from, -1, MapMode.TrackDel);
    const to = changes.mapPos(this.to, 1, MapMode.TrackDel);

    return from === null || to === null ? null : new TabStopRange(this.level, from, to);
  }
}

const TABSTOP_RE = /\\\$|\$\{(?:(\d+)(?::([^{}]*))?|((?:\\[{}]|[^{}])*))\}|\$(\d+)/g;
export class Snippet {
  lines: readonly string[];
  tabStops: readonly TabStop[];

  constructor(lines: readonly string[], tabStops: readonly TabStop[]) {
    this.lines = lines;
    this.tabStops = tabStops;
  }

  instantiate(state: EditorState, pos: number) {
    const text = [],
      lineStart = [pos];
    const lineObj = state.doc.lineAt(pos),
      baseIndent = /^\s*/.exec(lineObj.text)![0];

    for (let line of this.lines) {
      if (text.length) {
        let indent = baseIndent,
          tabs = /^\t*/.exec(line)![0].length;
        for (let i = 0; i < tabs; i++) indent += state.facet(indentUnit);
        lineStart.push(pos + indent.length - tabs);
        line = indent + line.slice(tabs);
      }
      text.push(line);

      pos += line.length + 1;
    }

    const ranges = this.tabStops.map(
      (ts) => new TabStopRange(ts.level, lineStart[ts.line]! + ts.from, lineStart[ts.line]! + ts.to),
    );
    return { text, ranges };
  }

  static parse(template: string): Snippet {
    type LevelDef = { seq: number | null; name: string };
    const levels: LevelDef[] = [];

    const lines: string[] = [];
    const positions: TabStop[] = [];

    for (const rawLine of template.split(/\r\n?|\n/)) {
      let line = rawLine;
      const lineIndex = lines.length;

      let offset = 0;

      TABSTOP_RE.lastIndex = 0;

      for (;;) {
        const m = TABSTOP_RE.exec(line);
        if (m === null) break;
        const matchStart = m.index;
        const matchEnd = m.index + m[0].length;

        // エスケープされている場合
        if (m[0].startsWith('\\$')) {
          shiftPositionsAfter(positions, lineIndex, matchStart + offset, -1);
          line = line.slice(0, matchStart) + line.slice(matchStart + 1);
          TABSTOP_RE.lastIndex = matchStart + 1;
          offset--;
          continue;
        }

        // されていない場合
        // タブストップの番号と名前を取得
        const seq: number | null = m[1] != null ? +m[1] : m[4] != null ? +m[4] : null;
        // プレースホルダー
        const rawName: string = m[4] != null ? '' : (m[2] ?? m[3] ?? '');
        const name = rawName.replace(/\\([{}])/g, '$1');

        // タブストップのレベルを取得
        let levelIndex = levels.findIndex((l) => (seq != null ? l.seq === seq : name ? l.name === name : false));

        if (levelIndex < 0) {
          const seqOrder = (l: LevelDef) =>
            l.seq === 0 ? Infinity : l.seq != null ? l.seq : l.name ? Infinity - 1 : Infinity;
          const newOrder = seq === 0 ? Infinity : seq != null ? seq : name ? Infinity - 1 : Infinity;

          let insertAt = 0;
          while (insertAt < levels.length && seqOrder(levels[insertAt]!) < newOrder) insertAt++;
          levels.splice(insertAt, 0, { seq, name });
          levelIndex = insertAt;

          for (const pos of positions) if (levelIndex <= pos.level) pos.level++;
        }

        const removedLen = matchEnd - matchStart - rawName.length;
        shiftPositionsAfter(positions, lineIndex, matchStart + offset, -removedLen);

        positions.push(new TabStop(levelIndex, lineIndex, matchStart + offset, matchStart + offset + name.length));

        line = line.slice(0, matchStart) + rawName + line.slice(matchEnd);
        TABSTOP_RE.lastIndex = matchStart + rawName.length;
        offset -= removedLen;
      }

      // エスケープの解除
      line = line.replace(/\\([{}])/g, (_full, brace: string, escIndex: number) => {
        shiftPositionsAfter(positions, lineIndex, escIndex, -1);
        return brace;
      });

      lines.push(line);
    }

    return new Snippet(lines, positions);
  }
}

function shiftPositionsAfter(positions: TabStop[], lineIndex: number, after: number, delta: number): void {
  for (const pos of positions) {
    if (pos.line === lineIndex && after < pos.from) {
      pos.from += delta;
      pos.to += delta;
    }
  }
}

const tabStopMarker = Decoration.widget({
  widget: new (class extends WidgetType {
    toDOM() {
      const span = document.createElement('span');
      span.className = 'cm-snippetFieldPosition';

      return span;
    }
    override ignoreEvent() {
      return false;
    }
  })(),
});
const tabStopRange = Decoration.mark({ class: 'cm-snippetField' });

class ActiveSnippet {
  deco: DecorationSet;
  ranges: readonly TabStopRange[];
  activeLevel: number;

  constructor(ranges: readonly TabStopRange[], activeLevel: number) {
    this.deco = Decoration.set(
      ranges.map((r) => (r.from === r.to ? tabStopMarker : tabStopRange).range(r.from, r.to)),
      true,
    );
    this.ranges = ranges;
    this.activeLevel = activeLevel;
  }

  map(changes: ChangeDesc) {
    const ranges = [];
    for (const r of this.ranges) {
      const mapped = r.map(changes);
      if (!mapped) return null;
      ranges.push(mapped);
    }

    return new ActiveSnippet(ranges, this.activeLevel);
  }

  selectionInsideField(sel: EditorSelection) {
    return sel.ranges.every((range) =>
      this.ranges.some((r) => r.level === this.activeLevel && r.from <= range.from && range.to <= r.to),
    );
  }
}

const setActive = StateEffect.define<ActiveSnippet | null>({
  map(value, changes) {
    return value?.map(changes);
  },
});

const moveToLevel = StateEffect.define<number>();

const snippetState = StateField.define<ActiveSnippet | null>({
  create() {
    return null;
  },

  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setActive)) return effect.value;
      if (effect.is(moveToLevel) && value) return new ActiveSnippet(value.ranges, effect.value);
    }
    if (value && tr.docChanged) value = value.map(tr.changes);
    if (value && tr.selection && !value.selectionInsideField(tr.selection)) value = null;
    return value;
  },

  provide: (f) => EditorView.decorations.from(f, (val) => (val ? val.deco : Decoration.none)),
});

function tabStopSelection(ranges: readonly TabStopRange[], level: number): EditorSelection {
  return EditorSelection.create(
    ranges.filter((r) => r.level === level).map((r) => EditorSelection.range(r.from, r.to)),
  );
}

type SnippetFn = (
  editor: { state: EditorState; dispatch: (tr: Transaction) => void },
  completion: Completion | null,
  from: number,
  to: number,
) => void;
export function snippet(template: string): SnippetFn {
  const snippet = Snippet.parse(template);

  return (
    editor: { state: EditorState; dispatch: (tr: Transaction) => void },
    completion: Completion | null,
    from: number,
    to: number,
  ) => {
    const { text, ranges } = snippet.instantiate(editor.state, from);
    const { main } = editor.state.selection;
    const spec: TransactionSpec = {
      changes: { from, to: to === main.from ? main.to : to, insert: Text.of(text) },
      scrollIntoView: true,
      annotations: completion
        ? [pickedCompletion.of(completion), Transaction.userEvent.of('input.complete')]
        : undefined,
    };

    if (ranges.length) spec.selection = tabStopSelection(ranges, 0);
    if (ranges.some((r) => 0 < r.level)) {
      const active = new ActiveSnippet(ranges, 0);
      spec.effects = [setActive.of(active)];
      const effects = spec.effects as StateEffect<unknown>[];
      if (editor.state.field(snippetState, false) === undefined)
        effects.push(StateEffect.appendConfig.of([snippetState, snippetPointerHandler]));
    }

    editor.dispatch(editor.state.update(spec));
  };
}

function moveField(dir: 1 | -1): StateCommand {
  return ({ state, dispatch }) => {
    const active = state.field(snippetState, false);
    if (!active || (dir < 0 && active.activeLevel === 0)) return false;

    const next = active.activeLevel + dir;
    const last = 0 < dir && !active.ranges.some((r) => r.level === next + dir);

    dispatch(
      state.update({
        selection: tabStopSelection(active.ranges, next),
        effects: setActive.of(last ? null : new ActiveSnippet(active.ranges, next)),
        scrollIntoView: true,
      }),
    );

    return true;
  };
}

export const clearSnippet: StateCommand = ({ state, dispatch }) => {
  const active = state.field(snippetState, false);
  if (!active) return false;

  dispatch(state.update({ effects: setActive.of(null) }));

  return true;
};

export function applyToCurrentTabStop(view: EditorView, text: string): boolean {
  const active = view.state.field(snippetState, false);
  if (!active) return false;

  const currentRanges = active.ranges.filter((r) => r.level === active.activeLevel);
  if (currentRanges.length === 0) return false;

  const changes = currentRanges.map((r) => ({ from: r.from, to: r.to, insert: text }));
  const changeSet = view.state.changes(changes);

  const newRanges = active.ranges.map((r) => {
    if (r.level === active.activeLevel) {
      const newFrom = changeSet.mapPos(r.from, -1);
      return new TabStopRange(r.level, newFrom, newFrom + text.length);
    }
    return new TabStopRange(r.level, changeSet.mapPos(r.from, -1), changeSet.mapPos(r.to, 1));
  });

  const next = active.activeLevel + 1;
  const hasNext = newRanges.some((r) => r.level === next);

  view.dispatch(
    view.state.update({
      changes,
      selection: hasNext ? tabStopSelection(newRanges, next) : undefined,
      effects: setActive.of(hasNext ? new ActiveSnippet(newRanges, next) : null),
      scrollIntoView: true,
    }),
  );

  return true;
}

export const nextSnippetField = moveField(1);
export function hasNextSnippetField(state: EditorState): boolean {
  const active = state.field(snippetState, false);
  return !!active?.ranges.some((r) => r.level === active!.activeLevel + 1);
}

export const prevSnippetField = moveField(-1);
export function hasPrevSnippetField(state: EditorState): boolean {
  const active = state.field(snippetState, false);
  return !!(active && 0 < active.activeLevel);
}

const snippetPointerHandler = EditorView.domEventHandlers({
  mousedown(event, view) {
    const active = view.state.field(snippetState, false);
    if (!active) return false;

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;

    const match = active.ranges.find((r) => r.from <= pos && pos <= r.to);
    if (!match || match.level === active.activeLevel) return false;

    view.dispatch({
      selection: tabStopSelection(active.ranges, match.level),
      effects: setActive.of(
        active.ranges.some((r) => match.level < r.level) ? new ActiveSnippet(active.ranges, match.level) : null,
      ),
      scrollIntoView: true,
    });

    return true;
  },
});
