# To users of Obsidian LaTeX Suite

## Comparison with Obsidian LaTeX Suite

Meanings of the symbols:

- ✅: Not needed / already supported
- ⚠️: Partially supported
- ❌: Not supported

### ✅ Auto-fraction

In Typst, typing <kbd>/</kbd> in math mode is treated as a fraction.
If you want the `/` character itself, either escape it or type `slash`.

### ⚠️ Matrix shortcuts

With Script Snippets you can instantly generate a matrix of the desired size.
Combined with this plugin's unique Tabout feature, matrix editing becomes fast.

### ✅ Conceal

Typst accepts Unicode characters directly, so concealment is unnecessary.
Additionally, this plugin provides symbol suggestions & completion.

### ✅ Tabout

Additionally, jumping with the <kbd>Shift + Tab</kbd> key is also supported.
See [here](/docs/TabJump.md) for details.

### ✅ Visual snippets

Supports a wider variety of snippet types.
See [here](/docs/Shortcut.md) for details.

### ✅ Auto-enlarge brackets

Typst adjusts bracket sizes automatically.
If you want to customize this, use [Left/Right](https://typst.app/docs/reference/math/lr).

### ✅ Color and highlight matching brackets

Instead of coloring the bracket adjacent to the cursor, this highlights the parent bracket at the cursor's position.
This makes nesting relationships easier to understand.

### ✅ Editor commands

Additionally, this plugin has its own unique commands.
See [here](/docs/Commands.md) for details.

### ✅ Snippets

Custom variables using brackets are available.
Suggestions and completion also work.

---

## Highlights of Typst

A brief introduction:

1. The syntax is very clear and easy to read.
2. Incremental/differential compilation makes rendering fast.
3. Implemented in Rust
   - The compiler is simple and error messages are easy to understand.
   - Easy to compile to Wasm, so packages can be used freely even on mobile.

## Highlights of this plugin

1. Math will automatically match the theme text color (can be disabled).
2. The Processor provides powerful customization for the preamble and styling.
3. Font and package management is supported.
4. Fast typing enabled by symbol completion and powerful custom snippets.

## Migration

You can continue using the traditional MathJax rendering engine, there are fallback options, Typst Tools for converting LaTeX to Typst, and commands to convert an entire file or a selected portion to Typst.
