# Processor

## What is a Processor?

A Processor is a collection of options that customize the rendering results, including code templates, rendering modes, styling, and more.

## Why are Processors needed?

Typst achieves fast rendering through a mechanism called *incremental/differential compilation*.
By having each processor function as a single file, Typst's powerful performance is realized.

This is particularly useful when previewing display math in real-time with heavy packages.
Typst Mate also includes an inline preview feature that leverages this capability.

## How do Processors work?

Each processor has a specific way to specify its ID.
Processors are checked in order from the top-level processor that matches the ID.
Additionally, all processors are compiled when the plugin is loaded.

## Types of Processors

### Inline Processor

Works with *inline math* (`$...$`).
To specify a processor, place the ID at the beginning followed by a colon and then the code, like `id:code`.

The `inline-middle` styling option vertically centers inline math so it lines up naturally with the surrounding text. Since it may be offset from regular text input, please use it appropriately depending on the situation.
[![Screenshot](/assets/inline-styling.png)](#inline-styling)

### Display Processor

Works with *display math* (`$$...$$`).
To specify a processor, enter the ID after the initial `$$`.

### CodeBlock Processor

Works with *code block* (<code>\`\`\`...\`\`\`</code>) or (`~~~...~~~`).
To specify a processor, enter the ID after the initial <code>\`\`\`</code> or `~~~`.

Note that adding or editing code block IDs will not take effect and are fixed when the plugin is loaded. This is due to Obsidian's constraints.

### Excalidraw Processor

Becomes available when the Excalidraw plugin is installed. Can be added using the `typst-render-to-excalidraw` command.
Please note the following:

- Settings like `Use Theme Text Color` and `Base Color` do not work.
- Currently, editing is not supported.

## Notes

- The `fontsize` [Layout/Length](https://typst.app/docs/reference/layout/length/) value references Obsidian's default settings and is fixed to the value when the plugin is loaded.
- The `datetime` [Foundations/Datetime](https://typst.app/docs/reference/foundations/datetime/) value is fixed to the value when the plugin is loaded based on the local timezone.
- The `smallcaps` [Foundations/Function(text)](https://typst.app/docs/reference/text/smallcaps/) value refers to the default `text` font used in **markup mode**, not the `text` font setting used inside **math mode** to use this in math mode easily.
- The `CURSOR` [Foundations/text] value is implemented with an element equivalent to `text(fill: rgb("#44f"))[▮]` for the snippet feature.
- Only the first page is rendered.
- In tables or blockquotes, use *display math* instead of *code blocks*. `<br>` and `\n[\s\t]*>` will be automatically replaced with line breaks.
- While there are examples of using Typst for Syntax Highlighting in CodeBlock Processor, we recommend using the [Obsidian Shiki Plugin](https://github.com/mProjectsCode/obsidian-shiki-plugin).
- Do not include special characters, especially slashes `/`, in Processors. This may cause issues.
