# Migrating from Obsidian LaTeX Suite

A guide for users coming from Obsidian LaTeX Suite.

## Comparison with Obsidian LaTeX Suite

Legend:

- ✅: Not needed / already supported
- ⚠️: Partially supported
- ❌: Not supported

### ✅ Auto-fraction

In Typst, typing <kbd>/</kbd> in math mode creates a fraction.
If you want to type the `/` character itself, either escape it or type `slash`.

### ⚠️ Matrix shortcuts

You can instantly generate a matrix of the desired size with Script Snippets.
Combined with this plugin's unique Tabout feature, matrix editing becomes fast.

### ✅ Conceal

Typst accepts Unicode characters directly, so concealment is unnecessary (though it is still supported).
Additionally, this plugin provides symbol suggestions & completion.

### ✅ Tabout

Jumping with the <kbd>Shift + Tab</kbd> key is also supported.
See [here](/docs/TabJump.md) for details.

### ✅ Visual snippets

Supports a wider variety of snippet types.
See [here](/docs/Shortcuts.md) for details.

### ✅ Auto-enlarge brackets

Typst adjusts bracket sizes automatically.
If you want to customize this behavior, use [Left/Right](https://typst.app/docs/reference/math/lr).

### ✅ Color and highlight matching brackets

Instead of coloring the bracket adjacent to the cursor, this plugin highlights the parent bracket at the cursor's position, making nesting relationships easier to understand.

### ✅ Editor commands

This plugin has its own unique commands.
See [here](/docs/Commands.md) for details.

### ✅ Snippets

Supports custom variables using brackets.
Suggestions and completions also work.

---

## Highlights of Typst

A brief introduction:

1. The syntax is very clear and easy to read.
2. Incremental/differential compilation makes rendering fast.
3. Implemented in Rust
   - Error messages are clear and easy to understand.
   - Easy to compile to Wasm, so you can use packages freely even on mobile.

## Highlights of this plugin

1. Math will automatically match the theme text color (can be disabled).
2. The Processor provides powerful customization for the preamble and styling.
3. Supports font and package management.
4. Fast typing enabled by symbol completion and powerful custom snippets.

## Migration

You can continue using the traditional MathJax rendering engine, there are fallback options, Typst Tools for converting LaTeX to Typst, and commands to convert an entire file or a selected portion to Typst.
