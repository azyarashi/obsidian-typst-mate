# Typst Compiler in Typst Mate

\[English | [日本語](./README.ja.md)\]

To provide a more comfortable experience, some library definitions differ from the standard Typst CLI compiler.

## Variable Definitions

### `fontsize` (`length`)

Defined in the global scope, it is equal to the Obsidian font size multiplied by 0.8.

### `boxed` (`function`)

Defined in both global and math scopes, it acts as an equivalent to the `\boxed` command from TeX's [amsmath package](https://ctan.org/pkg/amsmath).
This is utilized by the [`box-equation` command](../Commands/README.md#).

```typst
#let boxed(it) = box(
  if type(it) == content {it} else [#it],
  inset: 0.25em,
  stroke: black + 1pt
)
```

### `typstmate` (`module`)

#### `wikilink` (`function`)

Allows the use of Obsidian [Wikilinks](https://help.obsidian.md/Linking+notes+and+files/Internal+links).

```typst
#typstmate.wikilink("MyFile#Header")
#typstmate.wikilink("MyFile#Header")[Display Content]
```

> [!WARNING]
> Currently, features such as [Backlinks](https://help.obsidian.md/Plugins/Backlinks) and [Embedding files](https://help.obsidian.md/Linking+notes+and+files/Embed+files) are not supported.

### `tylax` (`module`)

#### `l2t`, `t2l` (`function`)

Enables the use of `latex_to_typst` and `typst_to_latex` from [TyLax](https://github.com/scipenai/tylax).

By setting the named argument `full` to `true`, `latex_document_to_typst` and `typst_document_to_latex` can be used.

## Style Definitions

### `smallcaps`

Adjusted to reference the standard Typst fonts even in math mode.
This allows the use of `smallcaps` in math mode without any additional configuration.
