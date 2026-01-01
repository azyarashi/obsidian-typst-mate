# Tab Jump

Tab Jump allows you to navigate through math content using the <kbd>Tab</kbd> key or <kbd>Shift + Tab</kbd> key.

## `#CURSOR` Jump

When `#CURSOR` is present, pressing the <kbd>Tab</kbd> key will remove `#CURSOR` and jump to that position.

## Bracket Jump

When there is a `)`, `]`, or `}`, pressing the <kbd>Tab</kbd> key will move to the right side of it, allowing you to escape from the bracket.
Also, when there is a `(`, `[`, or `{`, pressing the <kbd>Shift + Tab</kbd> key will move to the left side of it.

## Math Jump

If neither `#CURSOR` Jump nor Bracket Jump occurs, it will move to the edge of the math content.
