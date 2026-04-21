# Typst Mate の Typst コンパイラー

[英語](./README.md) | 日本語

利用をより快適にするために、Typst CLI のコンパイラーとはいくつかのライブラリ定義が異なっています。

## 変数定義

### `fontsize` (`length`)

グローバルスコープに、 Obsidian のフォントサイズが 0.8 倍されて定義されています。

### `boxed` (`function`)

グローバルスコープと数学スコープの両方に、TeX における amsmath パッケージの `\boxed` に相当する関数が定義されています。

### `typstmate` (`module`)

#### `wikilink` (`function`)

Obsidian の [ウィキリンク](https://obsidian.md/ja/help/links) が使用できます。

```typst
#typstmate.wikilink("MyFile#Header")
#typstmate.wikilink("MyFile#Header")[Display Content]
```

> [!WARNING]
> 現在、[バックリンク](https://obsidian.md/ja/help/plugins/backlinks) や [ファイルの埋め込み](https://obsidian.md/ja/help/embeds) などの機能はサポートされていません。

### `tylax` (`module`)

#### `l2t`, `t2l` (`function`)

[TyLax](https://github.com/scipenai/tylax) の `latex_to_typst` 及び `typst_to_latex` が使用できます。
名前付き引数 `full` に `true` を指定することで、`latex_document_to_typst` 及び `typst_document_to_latex` が使用できます。

## スタイル定義

### `smallcaps`

数学モードでも Typst 標準フォントを参照するように調整されています。
これにより、数学モードでも設定をすることなく `smallcaps` を使用できます。
