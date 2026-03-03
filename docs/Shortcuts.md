# Shortcuts

After selecting text inside a formula, press one of the keyboard shortcuts below to wrap it in a Typst function.

This feature corresponds to the "Visual snippets" feature in [Obsidian LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite).

## Variables

The following variables are used in the shortcut definitions:

- `🦭` - the selected text
- `"|"` - cursor position after expansion (editable placeholder)

---

The following shortcuts use lowercase letters, numbers, or symbols.

## [Cancel](https://typst.app/docs/reference/math/cancel/)

Key | Result
:--:|:------
<kbd>!</kbd> | `cancel(🦭)`

## [Left/Right](https://typst.app/docs/reference/math/lr)

Key | Result
:--:|:------
<kbd>l</kbd> | `lr(🦭)`
<kbd>a</kbd> | `abs(🦭)`
<kbd>n</kbd> | `norm(🦭)`
<kbd>f</kbd> | `floor(🦭)`
<kbd>c</kbd> | `ceil(🦭)`
<kbd>e</kbd> | `round(🦭)`

## [Roots](https://typst.app/docs/reference/math/roots)

Key | Result
:--:|:------
<kbd>2</kbd> | `sqrt(🦭)`
<kbd>3</kbd> | `root(3, 🦭)`
<kbd>4</kbd> | `root(4, 🦭)`
<kbd>5</kbd> | `root(5, 🦭)`
<kbd>6</kbd> | `root(6, 🦭)`
<kbd>7</kbd> | `root(7, 🦭)`
<kbd>8</kbd> | `root(8, 🦭)`
<kbd>9</kbd> | `root(9, 🦭)`

## [Stretch](https://typst.app/docs/reference/math/stretch)

Key | Result
:--:|:------
<kbd>^</kbd> | `stretch(🦭)^"|"`
<kbd>_</kbd> | `stretch(🦭)_"|"`

## [Styles](https://typst.app/docs/reference/math/styles)

Key | Result
:--:|:------
<kbd>u</kbd> | `upright(🦭)`
<kbd>b</kbd> | `bold(🦭)`

---

The following shortcuts use uppercase letters, except for `Variants/sans`.

## [Under/Over](https://typst.app/docs/reference/math/underover)

Key | Result
:--:|:------
<kbd>U</kbd> | `underbrace(🦭, "|")`
<kbd>O</kbd> | `overbrace(🦭, "|")`

## [Variants](https://typst.app/docs/reference/math/variants)

Key | Result
:--:|:------
<kbd>s</kbd> | `sans(🦭)`
<kbd>F</kbd> | `frak(🦭)`
<kbd>M</kbd> | `mono(🦭)`
<kbd>B</kbd> | `bb(🦭)`
<kbd>C</kbd> | `cal(🦭)`
<kbd>S</kbd> | `scr(🦭)`
