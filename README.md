# Typst Mate

<a href="https://obsidian.md/">
  <img alt="Obsidian Plugin" src="https://img.shields.io/badge/Desktop%20%26%20Mobile-a78bfa?logo=obsidian&logoColor=white" />
</a>
<a href="https://typst.app/docs/changelog/">
  <img alt="Typst Version" src="https://img.shields.io/badge/0.13.1-239dad?logo=typst&logoColor=white" />
</a>


Render math expressions in [Obsidian](https://obsidian.md) using [Typst](https://typst.app/) instead of MathJax.

[![TypstMate](assets/demo.png)](#demo)

[![SymbolSuggest](assets/symbol-suggest.gif)](#symbol-suggest)

Snippet                  | Script
:-----------------------:|:------------------------:
[![Snippet](assets/snippet.gif)](#snippet) | [![Script](assets/script-snippet.gif)](#script-snippet)

For details about the processor / snippet(script) / shortcut / tab jump, see [Processor](docs/processor/) / [Snippet](docs/snippet/) / [Shortcut](docs/Shortcut.md) / [TabJump](docs/TabJump.md).

I welcome pull requests featuring your wonderful snippets!

Are you an Obsidian LateX Suite user? Check out [this guide](docs/obsidian-latex-suite-migration.md).

---

## Features

- Support *inline math*, *display math*, and *code blocks*
- Support **preamble** and **templates** (called processors)
- **`.typ` View**
- **Bracket Jump**
- **Typst Shortcut**
- **Snippets** / **Scripts**
- **Bracket highlights**
- **Symbol completion**
  - type a leading backslash `\` to make the search look for LaTeX commands
- **Inline math preview**
- **Available on mobile app**
- Offer **background rendering**
- Use **font size** from Obsidian settings
- Inherit **text color** from Obsidian theme
- **Additional styling customization**
  - e.g., an option `inline-middle` to vertically center *inline math* so it lines up naturally with the surrounding text
- Use **custom fonts** and import system fonts (desktop app only for import)
- Almost all **Typst packages** are supported (desktop app only for import local packages)
- **Table and blockquotes support** with proper display math handling (`<br>` and `\n[\s\t]*> ` will be automatically replaced with line breaks)
- [Excalidraw](https://www.obsidianstats.com/plugins/obsidian-excalidraw-plugin) integration
- [No more flickering inline math](https://www.obsidianstats.com/plugins/inline-math) compatibility
- PDF Export, [Better Export PDF](https://www.obsidianstats.com/plugins/better-export-pdf), [Export Image plugin](https://www.obsidianstats.com/plugins/obsidian-export-image), and [Webpage HTML Export](https://www.obsidianstats.com/plugins/webpage-html-export) compatibility
- Typst Tools
  - Symbols viewer
  - Packages viewer
  - Snippets editor
  - Processors editor
  - Bidirectional converter between TeX/LaTeX and Typst ([MiTex](https://github.com/mitex-rs/mitex) / [tex2typst](https://github.com/qwinsi/tex2typst)) (Typst to TeX/LaTeX conversion is `tex2typst` mode only)

For a better typing experience, I **strongly** recommend installing the [No more flickering inline math](https://www.obsidianstats.com/plugins/inline-math) plugin by [RyotaUshio](https://github.com/RyotaUshio):

Turned OFF               | Turned ON
:-----------------------:|:------------------------:
![Turned OFF](https://github.com/RyotaUshio/obsidian-inline-math/blob/master/fig/off.gif?raw=true) | ![Turned ON](https://github.com/RyotaUshio/obsidian-inline-math/blob/master/fig/on.gif?raw=true)

## Installation

Currently, it's under review for the official plugin list. This process may take several months.
Until then, please install using the official plugin [BRAT](https://tfthacker.com/brat-quick-guide).

[![Screenshot](assets/install-with-brat.png)](#install-with-brat)

## Compatibility

### Obsidian App

- PDF Export

### Other Plugins

- [Excalidraw](https://www.obsidianstats.com/plugins/obsidian-excalidraw-plugin) (use the `typst-render-to-excalidraw` command)
- [Markmind](https://www.obsidianstats.com/plugins/obsidian-markmind) (requires background rendering to be disabled)
- [No more flickering inline math](https://www.obsidianstats.com/plugins/inline-math)
- [Better Export PDF](https://www.obsidianstats.com/plugins/better-export-pdf)
- [Export Image plugin](https://www.obsidianstats.com/plugins/obsidian-export-image)
- [Webpage HTML Export](https://www.obsidianstats.com/plugins/webpage-html-export) (don't forget to include CSS from Style Options)

### Default Preamble

```typst
#set page(margin: 0pt, width: auto, height: auto)
#show raw: set text(1.25em)
#set text(size: fontsize)
#let scr(it) = text(features: ("ss01",), box($cal(it)$))
```

### Custom Styling

You can apply your own custom CSS, not just the styling included in the plugin.
Depending on the three modes (`inline`, `display`, and `codeblock`), the styling method (`style`), and the identifier (`id`), the following CSS classes will be added:

- `typstmate-(mode)`
- `typstmate-style-(style)`
- `typstmate-id-(id)`

---

Typst Mate leverages the following open-source projects:

- [Typst](https://typst.app/) – a modern and powerful typesetting system
- [MiTex](https://github.com/mitex-rs/mitex) – a fast, lightweight LaTeX to Typst converter with **high compatibility**
- [tex2typst](https://github.com/qwinsi/tex2typst) – a fast, lightweight bidirectional converter between TeX/LaTeX and Typst with **readable output**

I'm grateful to the developers for making this plugin possible!

---

## NEXT

- OCR
- Obsidian LateX Suite関連
  - Matrix shortcuts
- モジュールや定義した変数や関数の補完, シグネチャのTooltip
- 機能のオンオフ, 設定画面の改善

## TODO

- RTL の対応
- 記号のお気に入り機能とユーザー定義
- `.typ` ファイルの編集
- フォーマット機能
- スニペットの充実・検索
- モバイルで頻繁にクラッシュする問題の解決
- Excalidrawプラグインへのレンダリングの利便性の向上
- 諸々における設定のハイライト, UI改善
- パッケージの更新の確認
- Typst Universe外, Githubからの手動パッケージインストール