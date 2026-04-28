# Typst Mate

<a href='https://obsidian.md/'>
  <img alt='Obsidian Plugin' src='https://img.shields.io/badge/Desktop%20%26%20Mobile-a78bfa?logo=obsidian&logoColor=white' />
</a>
<a href='https://typst.app/docs/changelog/'>
  <img alt='Typst Version' src='https://img.shields.io/badge/v0.14.2-239dad?logo=typst&logoColor=white' />
</a>
<a href='https://www.buymeacoffee.com/azyarashi' target='_blank'>
  <img src='https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png' alt='Buy Me A Coffee' style='height: 20px !important;width: 87px !important;' >
</a>
<a href='https://deepwiki.com/azyarashi/obsidian-typst-mate'>
  <img src='https://deepwiki.com/badge.svg' alt='Ask DeepWiki'>
</a>

\[English | [日本語](./README.ja.md)\]

Typst Mate is a plugin that replaces the traditional math rendering engine ([MathJax](https://www.mathjax.org/)) used in [Obsidian](https://obsidian.md) with [Typst](https://typst.app/).
It supports not only use in code blocks and compatibility with export features, but also changing the rendering engine used for certain notes and math formulas, and even use alongside [LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite).
It also includes many [Extensions](#extensions) to improve the experience.

> [!IMPORTANT]
> For a better typing experience, I **strongly** recommend installing [No More Flickering Inline Math](https://www.obsidianstats.com/plugins/inline-math).
>
> Turned OFF               | Turned ON
> :-----------------------:|:------------------------:
> ![Turned OFF](https://github.com/RyotaUshio/obsidian-inline-math/blob/master/fig/off.gif?raw=true) | ![Turned ON](https://github.com/RyotaUshio/obsidian-inline-math/blob/master/fig/on.gif?raw=true)

## Basic Features

- A powerful preamble and template system called [Processor](./Processor/README.md)
- Editing and previewing Typst files, quick previews and embeds, called [`.typ` Editor](./Typ-Editor/README.md)
- [Automatically references theme text colors](./Renderer/README.md)
- [Advanced snippet features](./Typst-Mate-Actions/README.md)
- Use of custom fonts and support for all packages
- Right click menu to copy SVG directly
- [Customizable styles](./Processor/README.md)
- Many tools such as converters
- Correct alignment of inline math, and fixing display math in tables and blockquotes

## Extensions

| Name                    | Description                                                                                                                                    |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto Complete           | Completes variables, packages, font information, and more.                                                                                     |
| Symbol Conceal          | Detects strings accessing the [`sym` module](https://typst.app/docs/reference/symbols/sym/) and displays them as the corresponding characters. |
| Pair Highlight          | Highlights pairs such as parentheses.                                                                                                          |
| Tab Jump                | [Details](./Tab-Jump/README.md)                                                                                                                |
| Preview Jump            | Clicking the preview jumps to the corresponding code position.                                                                                 |
| Code Jump               | <kbd>Ctrl</kbd> clicking the code jumps to the corresponding preview position.                                                                 |
| Tooltip                 | Hovering over code displays a tooltip.                                                                                                         |
| Formatter               | Formats using [Typstyle](https://typstyle-rs.github.io/typstyle/).                                                                             |
| Syntax Highlight        | Highlights syntax.                                                                                                                             |
| Linter                  | Displays errors and warnings with squiggly lines.                                                                                              |
| Typst Mate Action       | [Details](./Typst-Mate-Actions/README.md)                                                                                                      |
| Inline Preview          | Adds a popover to display previews of inline math.                                                                                             |
| Codeblock Preview       | Displays a preview below code blocks.                                                                                                          |
| LaTeX Suite Integration | [Details](./LaTeX-Suite/README.md)                                                                                                             |
| Vim                     | Enables Vim keybindings using [Vimee](https://vimee.dev).                                                                                      |
| Indent Rainbow          | <https://open-vsx.org/extension/oderwat/indent-rainbow>                                                                                        |
| Error Lens              | <https://open-vsx.org/extension/usernamehw/errorlens>                                                                                          |
| Folding                 | Folds elements that span multiple lines.                                                                                                       |

## Compatibility

### Official Features

- `Export to PDF`

### Plugins

#### Math

- [LaTeX Suite](https://www.obsidianstats.com/plugins/obsidian-latex-suite)
  Please check [here](./LaTeX-Suite/README.md) for details.
- [No More Flickering Inline Math](https://www.obsidianstats.com/plugins/inline-math)
- [Equation Citator](https://github.com/FRIEDparrot/obsidian-equation-citator)
  You need to enable `Enable Typst Mode` from `Advanced Settings` and reload the plugin.

#### Drawing

- [Excalidraw](https://www.obsidianstats.com/plugins/obsidian-excalidraw-plugin)
- [Markmind](https://www.obsidianstats.com/plugins/obsidian-markmind)

#### Export

When exporting via community plugins, please disable background rendering.
You can change this from the plugin settings tab or the status bar (desktop app only).

- [Better Export PDF](https://www.obsidianstats.com/plugins/better-export-pdf)
- [Export Image plugin](https://www.obsidianstats.com/plugins/obsidian-export-image)
- [Webpage HTML Export](https://www.obsidianstats.com/plugins/webpage-html-export)
  (Please include the plugin's CSS in `Style Options / Include CSS from Plugins`)

## Acknowledgements

Typst Mate primarily utilizes the following open source projects:

- [Typst](https://typst.app/) A modern and powerful typesetting system
- [TyLax](https://github.com/scipenai/tylax) A fast and highly compatible converter
- [Typstyle](https://typstyle-rs.github.io/typstyle/) A beautiful and reliable formatter
- [Detypify](https://github.com/QuarticCat/detypify) A tool for recognizing handwritten symbols
- [Quiver](https://github.com/varkor/quiver) A tool for creating commutative diagrams
- [unicode-math](https://github.com/latex3/unicode-math) (distributed under the [LaTeX Project Public License (LPPL) 1.3c](https://ctan.org/license/lppl1.3c))

Also, when creating this plugin, I referenced the following open source project:

- [Obsidian Latex Suite](https://github.com/artisticat1/obsidian-latex-suite)

I am deeply grateful to these developers!

## Disclosures

Based on the [Developer policies](https://docs.obsidian.md/Developer+policies) set by Obsidian, I disclose the following information:

### Access to External Files

- (Desktop app only) If a package is not found in the vault, it will access the location of packages used by the Typst CLI before downloading into the vault. For the exact location, refer to [typst/packages](https://github.com/typst/packages/blob/main/README.md).

### Network Access

- Upon first launch or plugin update, it downloads default Typst Mate actions and Wasm from Github servers.
- It retrieves package lists and downloads packages from Typst servers.

### Other

- Depending on the content of Typst Mate actions created by the user themselves, and the Typst code written by the user or packages used, the above matters (access to external files, network access) may occur.
- No payment or account is required for full access to the plugin, but if you would like to support this project, you can donate from 3$ at [azyarashi@Buy Me a Coffee](https://buymeacoffee.com/azyarashi).
- The source code is open and exists as a [public repository on GitHub](https://github.com/azyarashi/obsidian-typst-mate). I welcome [contributions](../CONTRIBUTING.md) for feature additions, bug fixes, and additions/corrections to localizations.
- If you want to report an issue or request a feature, please [create an issue on GitHub](https://github.com/azyarashi/obsidian-typst-mate/issues/new) or contact me at [azyarashi@Discord](https://discord.com/users/710497575232340060).
