# Typst Mate アクション

\[[English](./README.md) | 日本語\]

> [!INFO]
> これは翻訳版です。最新の変更が反映されていない可能性があります。

Typst Mate アクションとは、[`LaTeX Suite` プラグインの Snippet 機能](https://github.com/artisticat1/obsidian-latex-suite/blob/main/DOCS.md#snippets) を Typst 用に改変したものです。

---

## Typst Mate アクションの解釈

ここでは、記述された Typst Mate アクションがどのように解釈されるかについて説明します。

### `c` (文脈) の解釈

アクションが有効になる状態を `c` に単体の場合は文字列、複数の場合は配列で指定できます。省略した場合は、`'typm'` となります。

```js
c: ['typ', 'typc']
```

| 状態 | 説明 |
| --- | --- |
| `md` | Markdown |
| `mjx` | MathJax |
| `typ` | Typst (マークアップモード) |
| `typc` | Typst (コードモード) |
| `typm` | Typst (数式モード) |
| `plain` | Typst (コメントや文字列リテラルの中など) |

> [!WARNING]
> MathJax 中での使用 (`mjx`) は、[`LaTeX Suite` プラグイン](obsidian://show-plugin?id=obsidian-latex-suite) の使用を推奨します。

### `r` (制約) の解釈

アクションが実行されるための制約に追加・緩和を行いたい場合、`r` に文字列または配列で指定できます。

```js
r: 'H'
```

| 追加        | 説明                                   |
| --------- | ------------------------------------ |
| `M` / `t` | Markdown / `.typ` エディターのみ            |
| `i` / `b` | インライン / ブロック数式のみ (Typst (数式モード) で有効) |
| `I` / `D` | インライン / ディスプレイ数式のみ (Markdown で有効)    |
| `H` / `E` | 行頭 / 行末のみ (空白は無視)                    |

それぞれは排他的で、同時に指定しても無効になります。

| 緩和  | 説明               |
| --- | ---------------- |
| `V` | Vim のノーマルモードでも実行 |

### `e` (拡張) の解釈

アクションの実行後に特定の動作を拡張したい場合、`e` に文字列または配列で指定します。

```js
e: ['B', 's']  // e: 'Bs'
```

| 動作 | 説明 |
| --- | --- |
| `H` | Typst (マークアップ) の場合、挿入したテキストの直前に `#` を挿入します。 |
| `B` | 挿入したテキストの直前が行頭ではない (空白は無視) かつスペースがない場合、直前にスペースを挿入します。 |
| `s` | 挿入したテキストの直後にスペースと次のタブストップを追加します。 |
| `l` | 挿入したテキストの直後に改行と次のタブストップを追加します。 |
| `C` | アクション実行後に補完を開始します。 |

```js
// @b@b -> beta beta
{
  trigger: '@b',
  action: 'beta',
  e: 'B'
}
```

### `trigger` (トリガー) の解釈

Trigger の種類には `hotkey`、`long-press`、`type`、`regex`、`complete` があります。

これらの種類と値を `t`, `v` にそれぞれ指定します。

```js
trigger: {t: 'type', v: 'hoge'}
```

また、直接文字列を指定することでタイプを省略できます。

```js
trigger: 'hoge'
```

その場合、1 文字なら `long-press`、2 文字以上なら `type` として解釈されます。

### `action` (アクション) の解釈

Action の種類には `snippet`、`script`、`commands` があります。

これらの種類と値を `t`, `v` にそれぞれ指定します。

```js
action: {t: 'snippet', v: 'hoge'}
```

また、直接文字列・関数を指定することで種類を省略できます。文字列の場合は `snippet`、関数を渡した場合は `script` として解釈されます。

```js
action: 'hoge'
```

`script` の値は以下のように指定してください。

```ts
type MatchType =
  | string  // hotkey / long-press のアクション実行前に選択されているテキスト
  | RegExpMatchArray  // regex の結果
  | undefined  // その他
type ScriptFn = (match: MatchType) => string
```

---

## Typst Mate アクションの動作

ここでは、解釈された Typst Mate アクションがどのように動作するかについて説明します。

### `trigger` (トリガー) の動作

アクションが実行される前、選択されているテキストやトリガーの値に一致したテキストは削除されます。

#### `hotkey` (ホットキー) と `long-press` (ロングプレス)

```js
{
  trigger: '!',
  action: 'cancel(#.0)',
  e: 's'
}
```

#### `type` (入力) と `regex` (正規表現)

```js
// intx -> integral | dif x #.2
{
  trigger: {t: 'regex', v: 'int(\d[a-z])'},
  action: 'integral #.1 dif #.0',
  e: 's'
}
```

#### `complete` (補完)

### `action` (アクション) の動作

#### `snippet` と `script`

script 関数が実行された文字列または

```js
行列の例
```

#### `commands` (コマンド)

値に記述したコマンドを実行します。`プラグインid:コマンドid` という形式で記述します。

`,` 区切りで複数のコマンドを実行できます。
途中で `true` を返すコマンドがあれば、そこで実行が終了します。

> [!IMPORTANT]
> 記述した順に実行されますが、前のコマンドの終了を待つことはありません。
