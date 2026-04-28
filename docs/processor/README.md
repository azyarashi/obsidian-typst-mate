# Processor

## What is a Processor?

A Processor is a collection of options that customize the rendering results, including code templates, rendering modes, styling, and more.

## Why Are Processors Needed?

Typst achieves fast rendering through a mechanism called *incremental/differential compilation*.
By having each processor function as a single file, Typst's powerful performance is realized.

This is particularly useful when previewing display math in real-time with heavy packages.
Typst Mate also includes an inline preview feature that leverages this capability.

## How Do Processors Work?

Each processor has a specific way to specify its ID.
Processors are checked in order from the top-level processor that matches the ID.
Additionally, all processors are compiled when the plugin is loaded.

## Types of Processors

### Inline Processor

Works with *inline math* (`$...$`).
To specify a processor, place the ID at the beginning followed by a colon and then the code, like `id:code`.

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

- Only the first page is rendered.
- In tables or blockquotes, use *display math* instead of *code blocks*. `<br>` and `\n[\s\t]*>` will be automatically replaced with line breaks.
- Do not include special characters, especially slashes `/`, in Processors. This may cause issues.
