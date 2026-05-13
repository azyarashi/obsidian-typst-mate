# [Properties](https://help.obsidian.md/Editing+and+formatting/Properties) (YAML Frontmatter)

\[English | [日本語](./README.ja.md)\]

The plugin supports the following 3 properties to be used as Markdown metadata.

> [!WARNING]
> It may not work correctly when used alongside plugins that export multiple notes simultaneously. Please use with caution.

## `difinitions/let` (List)

Performs a Typst [let binding](https://typst.app/docs/reference/scripting/#bindings).

This can be used in all Typst processors within that note.

```yaml
let: |
  fourier(f) = 1/sqrt(2 pi) integral_(-oo)^(oo) #f e^(-i omega t) dif t
  fourier_rev(f) = 1/sqrt(2 pi) integral_(-oo)^(oo) #f e^(i omega t) dif omega
```

> [!NOTE]
> Only either the `difinitions` property or the `let` property can be used. The `difinitions` property takes precedence.

## `import` (List)

Performs a Typst [module import](https://typst.app/docs/reference/scripting/#modules).

This can be used in all Typst processors within that note.

```yaml
import: |
  "@preview/pavemat:0.2.0": pavemat
```

## `math-engine` (Text)

When set to `mathjax`, the rendering engine for **all inline math and display math** used in that note will be fixed to MathJax, regardless of the processor settings.

Note that in this case, the 'Apply Processor to MathJax' setting (in the Advanced tab) will not be applied.
