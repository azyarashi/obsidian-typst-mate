# Obsidian LaTeX Suite

\[[English](./README.md) | 日本語\]

> [!INFO]
> これは翻訳版です。最新の変更が反映されていない可能性があります。

W.I.P.

## Tabstop

`$X` は `#.X` に、 `${X:text}` は `#.X"text"` に対応します。

## Snippet

### Visual Snippets

トリガータイプに `long-press`、アクションタイプに `snippet` (または `script`) を指定することに対応します。

#### アクションタイプが `snippet` の場合

`${VISUAL}` の代わりに、`snippet` 中の初めの Tabstop、すなわち `#.0` の部分に挿入されます。カーソルはその直後または `#.1` が存在する場合はそこに移動します。

#### アクションタイプが `script` の場合

`selected` 変数により使用可能です。

### Function Snippets

アクションタイプに `script` を指定することに対応します。

### Regex Snippets
