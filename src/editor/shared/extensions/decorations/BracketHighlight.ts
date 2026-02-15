import { syntaxTree } from '@codemirror/language';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import type { EditorHelper } from '@/editor';
import { BRACKET_MAP, OPEN_MAP, type Token, TypstTokenizer } from '../../utils/tokenizer';

import './BracketHighlight.css';

const parser = new TypstTokenizer();

export const createBracketHighlightExtension = (helper: EditorHelper): Extension => {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = this.buildDecorations(u.view);
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const state = view.state;
        const cursor = state.selection.main.head;
        // @ts-expect-error
        const tree = syntaxTree(state);

        const regions: { from: number; to: number; type: 'math' | 'code' }[] = [];
        tree.iterate({
          from: view.viewport.from,
          to: view.viewport.to,
          enter: (node) => {
            const name = node.name.toLowerCase();
            const isMath = name.includes('math');
            const isCode = /codeblock|hmd-code/.test(name);

            if (!isMath && !isCode) return;

            const type = isMath ? 'math' : 'code';

            const last = regions[regions.length - 1];
            if (last && last.type === type && node.from <= last.to + 1) {
              last.to = Math.max(last.to, node.to);
            } else {
              regions.push({ from: node.from, to: node.to, type });
            }
            return false;
          },
        });

        for (const region of regions) {
          if (region.type === 'code') {
            const line = state.doc.lineAt(region.from);

            let langLineNo = line.number;
            if (!line.text.trim().startsWith('```') && !line.text.trim().startsWith('~~~'))
              langLineNo = line.number - 1;

            if (1 <= langLineNo) {
              const prevLine = state.doc.line(langLineNo).text;
              const match = prevLine.match(/^(?:```|~~~)\s*([\w\-+]+)/);
              if (match) {
                const lang = match[1]!.toLowerCase();
                if (!helper.supportedCodeBlockLangs.has(lang)) continue;
              } else continue;
            }
          }

          const text = state.sliceDoc(region.from, region.to);
          const tokens = parser.tokenize(text);

          const brackets = tokens.filter((t) => t.type === 'bracket');
          const pairMap = new Map<number, number>();
          const stack: Token[] = [];

          for (const b of brackets) {
            if ('([{'.includes(b.text)) stack.push(b);
            else {
              const expected = OPEN_MAP[b.text];
              if (!expected) continue;
              const idx = stack.findLastIndex((s) => s.text === expected);
              if (idx === -1) continue;
              const open = stack.splice(idx, 1)[0];
              if (!open) continue;
              pairMap.set(open.from, b.from);
              pairMap.set(b.from, open.from);
            }
          }

          let enclosing: { open: number; close: number } | null = null;
          if (region.from <= cursor && cursor <= region.to) {
            const relCursor = cursor - region.from;
            for (const b of brackets) {
              if ('([{'.includes(b.text) && pairMap.has(b.from)) {
                const closePos = pairMap.get(b.from);
                if (closePos !== undefined && b.from <= relCursor && relCursor <= closePos + 1) {
                  const dist = closePos - b.from;
                  if (!enclosing || dist < enclosing.close - enclosing.open)
                    enclosing = { open: b.from, close: closePos };
                }
              }
            }
          }

          for (const t of tokens) {
            const absFrom = region.from + t.from;
            const absTo = region.from + t.to;

            let cls = '';
            let deco: Decoration | null = null;

            if (t.type === 'bracket') {
              const kind = BRACKET_MAP[t.text] || 'paren';
              cls = `typstmate-bracket-${kind}`;
              if (enclosing && (t.from === enclosing.open || t.from === enclosing.close))
                cls += ' typstmate-bracket-enclosing';
              deco = Decoration.mark({ class: cls });
            } else if (t.type === 'sym') {
              // Ignore
              continue;
            } else {
              cls = `typstmate-highlight-${t.type}`;
              deco = Decoration.mark({ class: cls });
            }

            if (deco) builder.add(absFrom, absTo, deco);
          }
        }

        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
};
