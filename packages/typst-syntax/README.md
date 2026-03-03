# @typstmate/typst-syntax

This project is a modified TypeScript port of `typst-syntax` from [typst/typst](https://github.com/typst/typst).

## Installation

```sh
bun install @typstmate/typst-syntax
```

## Usage

```ts
import { parse, type SyntaxNode } from '@typstmate/typst-syntax';

const code = `
#set page(width: auto, height: auto, margin: 1em)

#let vb(x) = math.bold(math.italic(x))

$
    nabla dot vb(E) & = rho / epsilon_0 \
  nabla times vb(E) & = - (partial vb(B)) / (partial t) \
    nabla dot vb(B) & = 0 \
  nabla times vb(B) & = mu_0 vb(J) + mu_0 epsilon_0 (partial vb(E)) / (partial t)
$`.trim();
const ast: SyntaxNode = parse(code);

console.log(ast)
```

```ts
import { StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { highlight, LinkedNode, parse, reparse, type SyntaxNode } from '@typstmate/typst-syntax';

export const typstTreeStateField = StateField.define<SyntaxNode>({
  create(state) {
    return parse(state.doc.toString());
  },

  update(value, transaction) {
    if (!transaction.docChanged) return value;

    const docString = transaction.state.doc.toString();
    let changesCount = 0;
    let changeFromA = 0;
    let changeToA = 0;
    let changeInsertedLen = 0;

    transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      changesCount++;
      changeFromA = fromA;
      changeToA = toA;
      changeInsertedLen = inserted.length;
    });

    if (changesCount === 1) {
      try {
        return reparse(value, docString, { start: changeFromA, end: changeToA }, changeInsertedLen);
      } catch (e) {
        console.warn('Reparse failed, falling back to full parse.', e);
        return parse(docString);
      }
    }

    return parse(docString);
  },
});

export const typstSyntaxHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (!update.docChanged && !update.viewportChanged) return;

      this.decorations = this.buildDecorations(update.view);
    }

    buildDecorations(view: EditorView): DecorationSet {
      const tree = view.state.field(typstTreeStateField);
      const { from: vpFrom, to: vpTo } = view.viewport;

      const marks: { from: number; to: number; class: string }[] = [];

      const traverse = (node: LinkedNode) => {
        const start = node.offset;
        const end = node.offset + node.len();

        if (end < vpFrom || vpTo < start) return;

        const cssClass = highlight(node);
        if (cssClass && start < end) marks.push({ from: start, to: end, class: cssClass });

        for (const child of node.children()) traverse(child);
      };

      traverse(LinkedNode.new(tree));
      marks.sort((a, b) => a.from - b.from);

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
```
